"use client";

import { useEffect, useRef, useState } from "react";
import { api, getToken, WS_URL } from "@/lib/api";

export interface WsMessage {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Live WebSocket subscription with resilience:
 * Falls back to an HTTP polling loop when ws.readyState !== OPEN.
 * Includes backoff and failure detection to prevent spamming console
 * errors when developing offline or when backend is down.
 */
export function useWebSocket(
  room: "admin" | "technician",
  onEvent: (msg: WsMessage) => void,
  pollPath?: string,
  pollIntervalMs = 8000,
) {
  const [connected, setConnected] = useState(false);
  const [polling, setPolling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;

  useEffect(() => {
    let dead = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let ws: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let consecutiveFailures = 0;

    const stopPolling = () => {
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      setPolling(false);
    };

    const scheduleNextPoll = (intervalMs: number) => {
      if (dead || !pollPath) return;
      stopPolling();
      setPolling(true);
      pollTimer = setTimeout(async () => {
        if (dead) return;
        try {
          // If offline or no auth token for protected paths, skip
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            scheduleNextPoll(Math.min(intervalMs * 2, 60000));
            return;
          }

          const data = await api.get<unknown>(pollPath);
          consecutiveFailures = 0;
          eventRef.current({ event: "poll.refresh", data: data as Record<string, unknown> });
          scheduleNextPoll(pollIntervalMs);
        } catch {
          consecutiveFailures++;
          // Exponential backoff up to 60s when backend is unreachable
          const nextInterval = Math.min(pollIntervalMs * Math.pow(1.5, consecutiveFailures), 60000);
          if (consecutiveFailures === 3) {
            console.debug(
              `[useWebSocket] Backing off polling on ${pollPath} due to repeated connection failures.`
            );
          }
          if (consecutiveFailures < 6) {
            scheduleNextPoll(nextInterval);
          } else {
            // Pause polling after 6 consecutive failures
            stopPolling();
            console.debug(`[useWebSocket] Polling paused for ${pollPath}.`);
          }
        }
      }, intervalMs);
    };

    const startPolling = () => {
      if (pollTimer || !pollPath) return;
      consecutiveFailures = 0;
      scheduleNextPoll(1000);
    };

    const connect = () => {
      if (dead) return;
      try {
        ws = new WebSocket(`${WS_URL}/api/v1/admin/ws/${room}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          stopPolling();
          consecutiveFailures = 0;
          // Keep-alive ping every 30 s
          pingTimer = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
          }, 30000);
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string) as WsMessage;
            if (msg.event !== "pong") eventRef.current(msg);
          } catch (err) {
            console.warn("[useWebSocket] Failed to parse message:", err);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
          }
          if (!dead) {
            // Only start polling if token exists or if not repeatedly failing
            if (getToken() && consecutiveFailures < 4) {
              startPolling();
            }
            setTimeout(connect, 5000); // Reconnect loop with backoff
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        console.debug("[useWebSocket] Initial WS connection skipped:", err);
        if (getToken()) {
          startPolling();
        }
      }
    };

    // Grace timer: if socket isn't OPEN within 4s and user is logged in, start fallback polling
    const graceTimer = setTimeout(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        if (getToken()) startPolling();
      }
    }, 4000);

    connect();

    return () => {
      dead = true;
      clearTimeout(graceTimer);
      if (pingTimer) clearInterval(pingTimer);
      stopPolling();
      ws?.close();
    };
  }, [room, pollPath, pollIntervalMs]);

  return { connected, polling };
}
