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

/**
 * Voice Intake Button adapted from Civic-Fix (ReportIssue.jsx)
 * Supports browser-native Web Speech API with interim speech tracking and audio pulsing.
 */
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
        title={isRecording ? "Click to stop recording" : "Dictate problem report"}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          isRecording
            ? "bg-red-500/20 text-red-400 border border-red-500/60 animate-pulse shadow-[0_0_12px_rgba(255,59,48,0.4)]"
            : "border border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-accent hover:text-white"
        }`}
      >
        {isRecording ? (
          <>
            <MicOff size={14} className="text-red-400 animate-spin" />
            <span>Listening...</span>
          </>
        ) : (
          <>
            <Mic size={14} className="text-accent" />
            <span>Voice Intake</span>
          </>
        )}
      </button>

      {/* Floating interim live speech preview */}
      {isRecording && interimText && (
        <div className="absolute top-10 left-0 z-30 min-w-[240px] max-w-sm rounded-lg border border-accent/40 bg-[#0d1117] p-2.5 shadow-xl text-left">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-accent uppercase tracking-wider mb-1">
            <Sparkles size={11} /> Live Speech Transcript:
          </div>
          <p className="text-xs text-[#c9d1d9] italic">
            &ldquo;{interimText}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};
