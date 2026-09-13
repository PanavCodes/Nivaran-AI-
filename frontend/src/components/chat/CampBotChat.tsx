"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface Message {
  sender: "bot" | "user";
  text: string;
  time: string;
}

/**
 * Floating CampBot Campus Assistant.
 * Clean, lightweight assistant for facility operations.
 */
export const CampBotChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hello! I am CampBot, your campus facilities assistant. Ask me about ongoing maintenance issues, floor status, or how to submit a report.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chips, setChips] = useState<string[]>([
    "What issues are on Floor 1?",
    "How do door QR codes work?",
    "Any active high-priority repairs?",
    "How does indoor clustering work?",
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { sender: "user", text: q, time: userTime }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post<{ text: string; chips?: { label: string; query: string }[] }>(
        "/api/v1/assistant/chat",
        { message: q }
      );

      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: res.text,
          time: botTime,
        },
      ]);
      if (res.chips && res.chips.length > 0) {
        setChips(res.chips.map((c) => c.query));
      }
    } catch {
      // Deterministic client-side facility assistant fallback (hackathon offline resilience)
      const lower = q.toLowerCase();
      let reply =
        "CampBot: Our 10-floor facility is actively monitored. You can submit grievances via the Radar Intake, drop exact blueprint pins, or scan door QR plaques.";
      let newChips = chips;

      if (lower.includes("floor 1") || lower.includes("1st floor")) {
        reply =
          "Floor 1 Status: Active emergency alert for an AC condensate line leak near Room 102 (Server Room). Priority: 82.5. Maintenance technicians are en route.";
        newChips = ["Emergency protocols", "How do door QR codes work?", "Check Floor 3 status"];
      } else if (lower.includes("floor 3") || lower.includes("3rd floor")) {
        reply =
          "Floor 3 Status: Active electrical alert for loose high-voltage conduit sparks in Hardware Lab 1. Priority: 76.0. IT team is assigned.";
        newChips = ["Check Floor 1 status", "How does indoor clustering work?"];
      } else if (lower.includes("qr") || lower.includes("door")) {
        reply =
          "Door QR Codes: Each room plaque features a spatial QR marker. Scanning it in the intake portal locks your floor, room number, and exact (x, y) blueprint coordinates automatically.";
        newChips = ["What issues are on Floor 1?", "How does indoor clustering work?"];
      } else if (lower.includes("cluster") || lower.includes("merge") || lower.includes("duplicate")) {
        reply =
          "Indoor Spatio-Semantic Clustering: Multiple reports on the same floor within 35 canvas units and ≥0.52 semantic similarity are automatically merged into a single actionable incident cluster with escalated priority.";
        newChips = ["Check Floor 1 status", "Any active high-priority repairs?"];
      } else if (lower.includes("emergency") || lower.includes("hazard") || lower.includes("urgent")) {
        reply =
          "Emergency Protocol: High-severity hazards (sparks, pipe bursts, chemical spills) trigger an automatic 2-hour SLA response tier with immediate technician dispatch.";
        newChips = ["Check Floor 1 status", "How do door QR codes work?"];
      } else if (lower.includes("leak") || lower.includes("water") || lower.includes("pipe")) {
        reply =
          "Water Leaks: Active leak clusters are tracked on Floor 1 (Server Room) and Floor 2 (CSE Corridor). Please exercise caution around wet flooring.";
        newChips = ["Check Floor 1 status", "Emergency protocols"];
      }

      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: reply,
          time: botTime,
        },
      ]);
      setChips(newChips);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open campus problem assistant"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
      >
        {isOpen ? <X size={20} /> : <Bot size={22} />}
      </button>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-40 w-[360px] sm:w-[390px] h-[500px] max-h-[80vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  CampBot
                  <Badge variant="accent" className="text-[9px] py-0 px-1.5 font-semibold">Assistant</Badge>
                </h4>
                <p className="text-[10px] text-slate-500">10-Floor Indoor Facility Grounding</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 text-xs ${
                  m.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.sender === "bot" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}
                <div
                  className={`relative max-w-[82%] rounded-xl px-3.5 py-2.5 shadow-2xs ${
                    m.sender === "user"
                      ? "bg-indigo-600 text-white font-medium rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <span
                    className={`block mt-1 text-[9px] ${
                      m.sender === "user" ? "text-indigo-200 text-right" : "text-slate-400"
                    }`}
                  >
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 size={14} className="text-indigo-600 animate-spin" />
                <span>Checking facility status…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {chips.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-t border-slate-100 bg-white">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(chip)}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about ongoing repairs or campus floors…"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700 transition cursor-pointer"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
};
