import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSpeech({ onResult }) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("❌ Speech Recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.language = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      console.log("🎤 Started listening");
    };

    recognition.onresult = (event) => {
      if (!event.results || !event.results.length) return; // ← prevents undefined length crash

      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        // Protect from undefined results
        const segment = event.results[i];
        if (!segment || !segment[0]) continue;

        const text = segment[0].transcript;
        if (segment.isFinal) final += text + " ";
      }

      if (final.trim()) {
        console.log("🔊 Final speech:", final.trim());
        onResultRef.current?.(final.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error("❌ Speech error:", event.error);
    };

    recognition.onend = () => {
      console.log("🛑 Speech ended");
      setIsListening(false);
    };

    return () => {
      try {
        recognition.abort();
      } catch {}
    };
  }, []);

  // ---- SAFE START ----
  const safeStart = (rec) => {
    try {
      rec.start();
    } catch (err) {
      console.warn("⚠️ start() blocked, retrying...");
      setTimeout(() => {
        try {
          rec.start();
        } catch (e) {
          console.error("❌ Retry failed:", e.message);
        }
      }, 10); // Chrome needs 2–10ms cooldown
    }
  };

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    if (isListening) {
      rec.stop();
      return setTimeout(() => safeStart(rec), 10);
    }

    safeStart(rec);
  }, [isListening]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
  }, []);

  return { isListening, startListening, stopListening };
}
