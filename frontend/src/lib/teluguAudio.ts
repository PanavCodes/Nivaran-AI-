/**
 * Nivaran AI — Authentic Telugu Audio Controller
 * Plays genuine native Telugu MP3 audio for emergency directives, WhatsApp citizen voice notes,
 * and field maintenance updates. Strictly eliminates any fallback to robotic English voices.
 */

let currentAudio: HTMLAudioElement | null = null;

// Pre-rendered, high-fidelity native Telugu speech audio clips stored in frontend/public/audio
const PRESET_TELUGU_AUDIO: Record<string, string> = {
  sparks: "/audio/telugu_hardware_sparks.mp3",
  cse_leak: "/audio/telugu_cse_leak.mp3",
  directive_emergency: "/audio/telugu_directive_emergency.mp3",
  directive_maintenance: "/audio/telugu_directive_maintenance.mp3",
  directive_general: "/audio/telugu_directive_general.mp3",
};

export function stopTeluguAudio(): void {
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

/**
 * Determine the best native Telugu MP3 clip based on text keywords or preset type.
 */
function resolveTeluguAudioSource(textOrPreset: string): string {
  const lower = textOrPreset.toLowerCase();

  if (PRESET_TELUGU_AUDIO[lower]) {
    return PRESET_TELUGU_AUDIO[lower];
  }

  // Check for emergency / hardware / electrical keywords
  if (
    lower.includes("spark") ||
    lower.includes("స్పార్క్") ||
    lower.includes("హార్డ్‌వేర్") ||
    lower.includes("hardware") ||
    lower.includes("అత్యవసర") ||
    lower.includes("emergency")
  ) {
    return PRESET_TELUGU_AUDIO.directive_emergency;
  }

  // Check for maintenance / water leak keywords
  if (
    lower.includes("leak") ||
    lower.includes("లీక్") ||
    lower.includes("వాటర్") ||
    lower.includes("water") ||
    lower.includes("నీటి") ||
    lower.includes("సిఎస్ఈ") ||
    lower.includes("cse")
  ) {
    return PRESET_TELUGU_AUDIO.directive_maintenance;
  }

  // Default general field directive
  return PRESET_TELUGU_AUDIO.directive_general;
}

export function playTeluguSpeech(
  textOrPreset: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): () => void {
  stopTeluguAudio();

  const audioPath = resolveTeluguAudioSource(textOrPreset);
  const audio = new Audio(audioPath);
  currentAudio = audio;

  let hasEnded = false;
  const finish = () => {
    if (!hasEnded) {
      hasEnded = true;
      if (currentAudio === audio) {
        currentAudio = null;
      }
      options?.onEnd?.();
    }
  };

  audio.onplay = () => {
    options?.onStart?.();
  };

  audio.onended = finish;

  audio.onerror = () => {
    // If local MP3 fails, try TTS endpoint
    const encoded = encodeURIComponent(textOrPreset.slice(0, 180));
    const fallbackTts = `https://translate.google.com/translate_tts?ie=UTF-8&tl=te&client=tw-ob&q=${encoded}`;
    const fallbackAudio = new Audio(fallbackTts);
    currentAudio = fallbackAudio;

    fallbackAudio.onended = finish;
    fallbackAudio.onerror = () => {
      // ONLY use browser SpeechSynthesis if a genuine Telugu voice is actually installed.
      // NEVER allow English (en-US or en-IN) to speak Telugu text!
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          const voices = window.speechSynthesis.getVoices();
          const teVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith("te") ||
              v.name.toLowerCase().includes("telugu")
          );
          if (teVoice) {
            const utterance = new SpeechSynthesisUtterance(textOrPreset);
            utterance.voice = teVoice;
            utterance.lang = "te-IN";
            utterance.rate = 0.95;
            utterance.onend = finish;
            utterance.onerror = finish;
            window.speechSynthesis.speak(utterance);
            return;
          }
        } catch {}
      }
      finish();
    };

    fallbackAudio.play().catch(() => finish());
  };

  audio.play().catch((err) => {
    console.warn("[TeluguAudio] Playback interrupted or autoplay blocked:", err);
    if (audio.onerror) {
      (audio.onerror as () => void)();
    } else {
      finish();
    }
  });

  return () => {
    audio.pause();
    finish();
  };
}
