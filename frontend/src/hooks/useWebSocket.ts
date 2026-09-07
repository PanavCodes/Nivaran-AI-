"use client";

import { useEffect, useRef, useState } from "react";
import { api, WS_URL } from "@/lib/api";

export interface WsMessage {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Live WebSocket subscription with resilience per BUILD.md addendum:
 * Render's free tier spins down idle instances and can drop long-lived
 * WebSocket connections — when ws.readyState !== OPEN, fall back to an
 * HTTP polling loop every 8 seconds.
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
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let ws: WebSocket | null = null;

    const startPolling = () => {
      if (pollTimer || !pollPath) return;
      setPolling(true);
      const tick = async () => {
        try {
          const data = await api.get<unknown>(pollPath);
          eventRef.current({ event: "poll.refresh", data: data as Record<string, unknown> });
        } catch {
          /* keep polling silently */
        }
      };
      tick();
      pollTimer = setInterval(tick, pollIntervalMs);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      setPolling(false);
    };

    const connect = () => {
      if (dead) return;
      try {
        ws = new WebSocket(`${WS_URL}/api/v1/admin/ws/${room}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          stopPolling();
          // Keep-alive ping every 30 s
          pingTimer = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
          }, 30000);
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string) as WsMessage;
            if (msg.event !== "pong") eventRef.current(msg);
          } catch {}
        };
        ws.onclose = () => {
          setConnected(false);
          if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
          }
          if (!dead) {
            startPolling(); // addendum: poll while the socket is down
            setTimeout(connect, 3000); // reconnect loop
          }
        };
        ws.onerror = () => ws?.close();
      } catch {
        startPolling();
      }
    };

    let pingTimer: ReturnType<typeof setInterval> | null = null;
    // If the socket isn't OPEN within 4 s of mount, start polling immediately
    const graceTimer = setTimeout(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) startPolling();
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
