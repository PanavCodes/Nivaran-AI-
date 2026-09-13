/**
 * Nivaran AI — English Voice & Audio Controller
 * Synthesizes clear English voice directives, citizen WhatsApp voice note playbacks,
 * and technician work order dispatches using the browser's Web Speech API with
 * automatic TTS fallback.
 */

let currentAudio: HTMLAudioElement | null = null;

export function stopSpeech(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}


export function playSpeech(
  text: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): () => void {
  stopSpeech();

  if (typeof window === "undefined" || !text) {
    options?.onError?.();
    return () => {};
  }

  let hasEnded = false;
  const finish = () => {
    if (!hasEnded) {
      hasEnded = true;
      options?.onEnd?.();
    }
  };

  // 1. Primary: Browser Web Speech API with English voice
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const enVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Google") || v.name.includes("Natural") || v.default)
        ) || voices.find((v) => v.lang.startsWith("en"));

      if (enVoice) {
        utterance.voice = enVoice;
      }

      utterance.onstart = () => {
        options?.onStart?.();
      };
      utterance.onend = finish;
      utterance.onerror = (e) => {
        console.warn("[Speech] Web speech error, attempting fallback:", e);
        fallbackAudio();
      };

      window.speechSynthesis.speak(utterance);
      return stopSpeech;
    } catch (err) {
      console.warn("[Speech] Web Speech API failed:", err);
    }
  }

  // 2. Fallback: English TTS audio
  function fallbackAudio() {
    try {
      const clean = encodeURIComponent(text.slice(0, 180));
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${clean}`;
      const audio = new Audio(url);
      currentAudio = audio;

      audio.onplay = () => options?.onStart?.();
      audio.onended = finish;
      audio.onerror = () => {
        finish();
        options?.onError?.();
      };
      audio.play().catch(() => finish());
    } catch {
      finish();
      options?.onError?.();
    }
  }

  fallbackAudio();
  return stopSpeech;
}

export function playPresetSpeech(
  preset: "cse_leak" | "sparks",
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): () => void {
  let englishText = "";
  if (preset === "cse_leak") {
    englishText =
      "Hello team, water tap outside CSE Lab on Floor 2 is leaking continuously. The floor is flooded creating a slip hazard.";
  } else if (preset === "sparks") {
    englishText =
      "Urgent alert: Sparks and smoke coming from electrical switchboard in Floor 3 Hardware Lab. Wires are overheating.";
  }
  return playSpeech(englishText, options);
}
