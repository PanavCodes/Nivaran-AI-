"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";

interface VoiceIntakeButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: (event: { error: string }) => void;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export const VoiceIntakeButton: React.FC<VoiceIntakeButtonProps> = ({
  onTranscript,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const latestTranscriptRef = useRef("");

  useEffect(() => {
    latestTranscriptRef.current = interimText;
  }, [interimText]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      if (!win.SpeechRecognition && !win.webkitSpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const startRecording = () => {
    if (typeof window === "undefined") return;
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SR();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setInterimText("");
        latestTranscriptRef.current = "";
      };

      recognition.onresult = (event) => {
        const text = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join("");
        setInterimText(text);
        latestTranscriptRef.current = text;
      };

      recognition.onend = () => {
        setIsRecording(false);
        const finalText = latestTranscriptRef.current.trim();
        if (finalText) {
          onTranscript(finalText);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start voice recognition:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        title={isRecording ? "Click to stop recording" : "Dictate incident report"}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer shadow-2xs ${
          isRecording
            ? "bg-red-50 text-red-700 border border-red-200"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        }`}
      >
        {isRecording ? (
          <>
            <MicOff size={14} className="text-red-600" />
            <span>Listening…</span>
          </>
        ) : (
          <>
            <Mic size={14} className="text-indigo-600" />
            <span>Voice Dictation</span>
          </>
        )}
      </button>

      {/* Floating interim live speech preview */}
      {isRecording && interimText && (
        <div className="absolute top-11 left-0 z-30 min-w-[240px] max-w-sm rounded-xl border border-indigo-200 bg-white p-3 shadow-lg text-left">
          <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <Sparkles size={11} /> Live Speech:
          </div>
          <p className="text-xs text-slate-700 italic">
            &ldquo;{interimText}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};
