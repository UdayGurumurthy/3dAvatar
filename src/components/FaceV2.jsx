// src/components/FaceV2.jsx
import React, { useEffect, useRef, useState, forwardRef, useMemo } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

const VISEME_LIST = [
  "AE",
  "AH",
  "BMP",
  "EE",
  "CHJ",
  "FV",
  "Er",
  "lh",
  "KGHNG",
  "Oh",
  "R",
  "SZ",
  "TLDN",
  "Th",
];

const AZURE_TO_GLTF = {
  0: "AE",
  1: "BMP",
  2: "FV",
  3: "Th",
  4: "TLDN",
  5: "KGHNG",
  6: "CHJ",
  7: "SZ",
  8: "lh",
  9: "R",
  10: "AE",
  11: "EE",
  12: "EE",
  13: "Oh",
  14: "Oh",
  15: "SZ",
  16: "lh",
  17: "BMP",
  18: "BMP",
  19: "EE",
  20: "TLDN",
  21: "Th",
};

const SCRIPT_MAP = {
  Introduction:
    "Hi! I'm Jenny, your assistant. Let's get started. What is your first name?",
  LastName: "Great. Now please tell me your last name.",
  PhoneNumber:
    "Perfect. What is your phone number? Please speak the digits clearly.",
  City: "Thanks. Which city do you currently live in?",
  Pincode:
    "Almost done. What is your pin code? Say it clearly so I can understand.",
  Completion:
    "All fields have been captured. Would you like to submit the form now?",
};

export const FaceV2 = forwardRef(
  ({ script, startListening, faceV2CallbackRef, ...props }, ref) => {
    const { scene } = useGLTF("/models/FaceV3_draco.glb");
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

    const morphMeshesRef = useRef([]);
    const audioRef = useRef(null);
    const visemeTimelineRef = useRef([]);
    const frameRef = useRef(null);

    const promptIndexRef = useRef(0);
    const fetchingRef = useRef(false);
    const animationRunningRef = useRef(false);
    const [started, setStarted] = useState(false);
    const lastScriptRef = useRef(script);

    // Collect morph target meshes
    useEffect(() => {
      const meshes = [];
      clone.traverse((obj) => {
        if (obj.isMesh && obj.morphTargetDictionary) {
          meshes.push(obj);
          if (obj.morphTargetInfluences) obj.morphTargetInfluences.fill(0);
        }
      });
      morphMeshesRef.current = meshes;
    }, [clone]);

    function hardReset() {
      morphMeshesRef.current.forEach((m) => {
        if (m.morphTargetInfluences) m.morphTargetInfluences.fill(0);
      });
    }

    function smoothResetAll() {
      animationRunningRef.current = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      let t = 0;
      function animate() {
        t += 0.06;
        morphMeshesRef.current.forEach((mesh) => {
          const infl = mesh.morphTargetInfluences;
          if (!infl) return;
          for (let i = 0; i < infl.length; i++) {
            infl[i] = THREE.MathUtils.lerp(infl[i], 0, 0.25);
          }
        });
        if (t < 1) requestAnimationFrame(animate);
      }
      animate();
    }

    function startVisemeAnimation() {
      if (!audioRef.current) return;

      animationRunningRef.current = true;
      const FADE_IN = 120;
      const FADE_OUT = 160;

      function animate() {
        if (!animationRunningRef.current || !audioRef.current) return;

        const currentMs = audioRef.current.currentTime * 1000;

        morphMeshesRef.current.forEach((mesh) => {
          const dict = mesh.morphTargetDictionary;
          const infl = mesh.morphTargetInfluences;
          if (!dict || !infl) return;

          infl.fill(0);

          for (let i = 0; i < visemeTimelineRef.current.length; i++) {
            const v = visemeTimelineRef.current[i];
            const t = currentMs - v.offset_ms;

            let strength = 0;
            if (t >= 0 && t <= FADE_IN) strength = t / FADE_IN;
            else if (t > FADE_IN && t < v.duration) strength = 1;
            else if (t >= v.duration && t <= v.duration + FADE_OUT)
              strength = 1 - (t - v.duration) / FADE_OUT;

            const idx = dict[v.viseme_name];
            if (idx !== undefined) infl[idx] = Math.max(infl[idx], strength);
          }
        });

        frameRef.current = requestAnimationFrame(animate);
      }

      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      animate();
    }

    function forceStopAudioAndAnimation() {
      animationRunningRef.current = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (e) {}
      }
    }

    async function fetchVisemeData(text) {
      if (fetchingRef.current) {
        console.log("⏭️ Already fetching");
        return;
      }

      if (!text || text.trim() === "") {
        console.warn("⚠️ Empty text");
        return;
      }

      fetchingRef.current = true;
      console.log("🟦 Fetching:", text);

      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/generate-viseme/?text=${encodeURIComponent(
            text
          )}`
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        // Map visemes
        visemeTimelineRef.current = (data.visemes || []).map((v) => ({
          offset_ms: v.offset_ms ?? 0,
          viseme_name: AZURE_TO_GLTF[v.viseme_id] ?? "AE",
          duration: v.duration_ms ?? 100,
        }));
        console.log(visemeTimelineRef.current, "visemevalue");

        console.log("✅ Visemes loaded:", visemeTimelineRef.current.length);

        // Decode audio from base64
        const bytes = Uint8Array.from(atob(data.audio_file_base64), (c) =>
          c.charCodeAt(0)
        );

        const blob = new Blob([bytes], {
          type: data.mime_type || "audio/mpeg",
        });
        const url = URL.createObjectURL(blob);

        forceStopAudioAndAnimation();

        // Create audio element
        const audio = new Audio(url);
        audio.preload = "auto";
        audioRef.current = audio;

        console.log("⏳ Audio element created, waiting to load...");

        // When audio metadata is loaded
        audio.onloadedmetadata = () => {
          console.log("📊 Audio metadata loaded, duration:", audio.duration);
        };

        // When enough is buffered to play
        audio.oncanplay = () => {
          console.log("✅ Audio ready to play");
        };

        // When audio ends
        audio.onended = () => {
          console.log("🎧 Audio finished");
          animationRunningRef.current = false;
          smoothResetAll();
          fetchingRef.current = false;

          // Auto-start listening after 500ms
          setTimeout(() => {
            if (typeof startListening === "function") {
              try {
                console.log("🎤 Auto-starting listening");
                startListening();
              } catch (e) {
                console.error("Error auto-starting:", e);
              }
            }
          }, 500);

          // Register callback
          if (faceV2CallbackRef && typeof faceV2CallbackRef === "object") {
            faceV2CallbackRef.current = () => {
              console.log("📣 Speech received!");
            };
          }
        };

        // Error handler
        audio.onerror = (e) => {
          console.error("❌ Audio error:", e);
          fetchingRef.current = false;
          setTimeout(() => playNextPrompt(), 1000);
        };

        // Start animation and play immediately
        console.log("▶️ Starting animation and playback");
        startVisemeAnimation();

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("▶️ Audio playing successfully");
            })
            .catch((error) => {
              console.error("❌ Play error:", error);
              fetchingRef.current = false;
              setTimeout(() => playNextPrompt(), 1000);
            });
        }
      } catch (err) {
        console.error("❌ fetchVisemeData error:", err);
        fetchingRef.current = false;
        setTimeout(() => playNextPrompt(), 200);
      }
    }

    function playNextPrompt() {
      const promptText = SCRIPT_MAP[script];

      console.log("➡️ playNextPrompt");
      console.log("   Script:", script);
      console.log("   Index:", promptIndexRef.current);
      console.log("   Text:", promptText);

      if (!promptText || promptText.trim() === "") {
        console.log("❌ No prompt");
        smoothResetAll();
        return;
      }

      const currentIndex = promptIndexRef.current;
      if (currentIndex >= 1) {
        console.log("⚠️ Already played");
        smoothResetAll();
        return;
      }

      promptIndexRef.current = 1;
      console.log("✅ Fetching viseme data");

      fetchVisemeData(promptText);
    }

    function handleStart() {
      console.log("🟢 START clicked");
      promptIndexRef.current = 0;
      hardReset();
      setStarted(true);
      setTimeout(() => playNextPrompt(), 500);
    }

    // When script changes
    useEffect(() => {
      if (!started) return;

      if (lastScriptRef.current === script) return;

      console.log("🔄 Script changed to:", script);
      lastScriptRef.current = script;

      promptIndexRef.current = 0;
      forceStopAudioAndAnimation();
      fetchingRef.current = false;

      setTimeout(() => {
        console.log("📣 Playing new script");
        playNextPrompt();
      }, 100);
    }, [script, started]);

    // Cleanup
    useEffect(() => {
      return () => {
        console.log("🧹 Cleanup");
        animationRunningRef.current = false;
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.src = "";
          } catch {}
        }
      };
    }, []);

    return (
      <>
        {!started && (
          <Html fullscreen className="pointer-events-auto">
            <div className="w-full h-full flex items-end justify-center pb-10">
              <div
                onClick={handleStart}
                className="cursor-pointer px-6 py-3 text-lg md:text-xl rounded-lg bg-black/60 text-white border border-white/40 backdrop-blur-sm hover:bg-black/80 transition-all"
              >
                Click to Begin
              </div>
            </div>
          </Html>
        )}

        <group {...props} scale={4}>
          <primitive object={nodes.pelvis} />
          <primitive object={nodes.neutral_bone} />

          {Array.from({ length: 9 }).map((_, i) => {
            const name = `Face_${i + 1}`;
            const node = nodes[name];
            if (!node) return null;
            return (
              <skinnedMesh
                key={name}
                geometry={node.geometry}
                skeleton={node.skeleton}
                material={
                  materials[node.material?.name] ?? Object.values(materials)[0]
                }
                morphTargetDictionary={node.morphTargetDictionary}
                morphTargetInfluences={node.morphTargetInfluences}
              />
            );
          })}
        </group>
      </>
    );
  }
);

FaceV2.displayName = "FaceV2";
export default FaceV2;
