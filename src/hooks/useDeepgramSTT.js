import { useRef, useState, useCallback } from "react";

export function useDeepgramSpeech({ onResult }) {
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const triggeredRef = useRef(false);

  const [isListening, setIsListening] = useState(false);

  const startListening = useCallback(async () => {
    if (isListening) return;

    triggeredRef.current = false;

    streamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const socketUrl =
      "wss://api.deepgram.com/v1/listen" +
      "?punctuate=true" +
      "&endpointing=300" +
      "&encoding=opus" +
      "&sample_rate=48000" +
      "&channels=1" +
      "&token=dg_xxxxxxxxxxxxxxxxxxxxx";

    socketRef.current = new WebSocket(socketUrl);

    socketRef.current.onopen = () => {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (
          socketRef.current &&
          socketRef.current.readyState === WebSocket.OPEN
        ) {
          socketRef.current.send(e.data);
        }
      };

      mediaRecorderRef.current.start(250);
      setIsListening(true);
    };

    socketRef.current.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      const transcript = data.channel?.alternatives?.[0]?.transcript;

      if (transcript && data.is_final && !triggeredRef.current) {
        triggeredRef.current = true;
        onResult?.(transcript.trim());
        stopListening();
      }
    };

    socketRef.current.onerror = (e) => {
      console.error("Deepgram socket error", e);
      stopListening();
    };
  }, [isListening, onResult]);

  const stopListening = useCallback(() => {
    setIsListening(false);

    try {
      mediaRecorderRef.current?.stop();
      socketRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
  }, []);

  return { isListening, startListening, stopListening };
}
