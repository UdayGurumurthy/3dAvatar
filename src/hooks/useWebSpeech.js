import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSpeech({ onResult, onListeningStart, onListeningStop }) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("❌ Speech Recognition not supported in this browser.");
      onResult?.("Error: Speech Recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = "en-US";

    recognition.onstart = () => {
      console.log("🎤 Listening started...");
      setIsListening(true);
      isSpeakingRef.current = false;
      onListeningStart?.();
    };

    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript;
        transcript += segment;
        if (event.results[i].isFinal) isFinal = true;
      }

      if (isFinal && transcript.trim()) {
        console.log(`✅ Final transcript: "${transcript.trim()}"`);
        isSpeakingRef.current = true;
        onResult?.(transcript.trim());
      } else if (transcript.trim() && !isSpeakingRef.current) {
        console.log(`🔵 Interim: "${transcript.trim()}"`);
      }
    };

    recognition.onerror = (event) => {
      console.error("❌ Speech Recognition error:", event.error);
      onResult?.(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      console.log("🛑 Listening stopped");
      setIsListening(false);
      onListeningStop?.();
    };

    return () => {
      try {
        recognition.abort();
      } catch (err) {
        console.error("Error aborting recognition:", err);
      }
    };
  }, [onResult, onListeningStart, onListeningStop]);

  const startListening = useCallback(() => {
    try {
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start();
        console.log("🎤 Manually started listening");
      }
    } catch (err) {
      console.error("Error starting listening:", err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        console.log("🛑 Manually stopped listening");
      }
    } catch (err) {
      console.error("Error stopping listening:", err);
    }
  }, [isListening]);

  return {
    isListening,
    startListening,
    stopListening,
  };
}
