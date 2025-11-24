// hooks/useVoskSpeech.js
import { useEffect, useRef } from "react";

export function useVoskSpeech({ onResult, active }) {
  const recognizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const voskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function initVosk() {
      try {
        console.log("🧠 Loading Vosk...");

        // Dynamically load Vosk from CDN
        if (!window.Vosk) {
          const script = document.createElement("script");
          script.src =
            "https://cdn.jsdelivr.net/npm/vosk-browser@0.3.0/dist/vosk.js";
          script.async = true;

          await new Promise((resolve, reject) => {
            script.onload = () => {
              console.log("✅ Vosk script loaded");
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        if (!window.Vosk) {
          throw new Error("Vosk failed to load");
        }

        voskRef.current = window.Vosk;
        const { Model, Recognizer } = window.Vosk;

        console.log("🧠 Initializing Vosk Model...");

        // Load model from public directory
        const model = new Model("vosk/model");
        await model.init();

        console.log("✅ Model initialized");

        const recognizer = new Recognizer(model, 16000);
        recognizerRef.current = recognizer;

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;

        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)({
          sampleRate: 16000,
        });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (cancelled || !recognizer) return;

          try {
            const inputData = event.inputBuffer.getChannelData(0);

            // Convert float32 to int16
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16Data[i] = Math.max(-1, Math.min(1, inputData[i]));
              int16Data[i] =
                int16Data[i] < 0
                  ? int16Data[i] * 0x8000
                  : int16Data[i] * 0x7fff;
            }

            recognizer.acceptWaveform(int16Data);
            const result = recognizer.result();

            if (result?.text) {
              onResult(result.text);
            } else if (result?.partial) {
              onResult(result.partial);
            }
          } catch (err) {
            console.error("❌ Audio processing error:", err);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        console.log("🎧 Vosk listening...");
      } catch (err) {
        console.error("❌ Vosk init failed:", err);
        if (onResult) {
          onResult(`Error: ${err.message}`);
        }
      }
    }

    if (active) {
      initVosk();
    }

    return () => {
      cancelled = true;

      try {
        if (processorRef.current) {
          processorRef.current.disconnect();
        }
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (recognizerRef.current?.free) {
          recognizerRef.current.free();
        }
      } catch (err) {
        console.error("❌ Cleanup error:", err);
      }
    };
  }, [active, onResult]);
}
