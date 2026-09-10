"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { sound } from "@/lib/sound";
import { Badge } from "@/components/ui/badge";

interface Message {
  sender: "bot" | "user";
  text: string;
  time: string;
}

/**
 * Floating CampBot Campus Problem AI Assistant.
 * Adapted directly from CampFeed (campfeed/app/Chatbot/page.js).
 */
export const CampBotChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hey! I'm CampBot 🤖 — your Nivaran AI campus maintenance assistant. Ask me anything about ongoing facility issues, floor status, or how to report problems!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chips, setChips] = useState<string[]>([
    "What issues are on Floor 1?",
    "How do door QR codes work?",
    "Any active emergency alerts?",
    "How does indoor clustering work?",
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    sound.playClick();
    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { sender: "user", text: q, time: userTime }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post<{ text: string; chips?: { label: string; query: string }[] }>(
        "/api/v1/assistant/chat",
        { message: q }
      );

      sound.playRadarPing();
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

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I couldn't reach the campus AI cluster right now. Please try again or check the floor plan!",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
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
        className="fixed bottom-5 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-accent text-[#0d1117] shadow-2xl hover:scale-105 active:scale-95 transition-all"
      >
        {isOpen ? <X size={22} /> : <Bot size={24} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
          </span>
        )}
      </button>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-40 w-[360px] sm:w-[400px] h-[520px] max-h-[80vh] flex flex-col rounded-2xl border border-[#30363d] bg-[#0d1117] shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[#0d1117]">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  CampBot AI
                  <Badge variant="accent" className="text-[8px] py-0 px-1">CampFeed</Badge>
                </h4>
                <p className="text-[10px] text-[#8b949e]">Grounding over 10-floor indoor live telemetry</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-[#8b949e] hover:bg-white/5 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0d1117]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 text-xs ${
                  m.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.sender === "bot" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                    <Bot size={13} />
                  </div>
                )}
                <div
                  className={`relative max-w-[80%] rounded-xl px-3.5 py-2.5 shadow ${
                    m.sender === "user"
                      ? "bg-accent text-[#0d1117] font-medium rounded-br-none"
                      : "bg-[#161b22] text-[#c9d1d9] border border-[#30363d] rounded-tl-none"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <span
                    className={`block mt-1 text-[9px] ${
                      m.sender === "user" ? "text-black/60 text-right" : "text-[#8b949e]"
                    }`}
                  >
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                <Bot size={14} className="text-accent animate-bounce" />
                <span>CampBot is checking live campus status…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {chips.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto px-3 py-1.5 border-t border-[#21262d] bg-[#161b22]/50 custom-scrollbar">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(chip)}
                  className="shrink-0 rounded-full border border-[#30363d] bg-[#0d1117] px-2.5 py-1 text-[10px] text-[#c9d1d9] hover:border-accent hover:text-accent transition"
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
            className="flex items-center gap-2 border-t border-[#30363d] bg-[#161b22] p-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask CampBot about campus issues…"
              className="flex-1 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs text-white outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[#0d1117] disabled:opacity-40 transition"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
};
