// src/components/FaceV3.jsx
import React, { useEffect, useRef, useState, forwardRef, useMemo } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

// -----------------------------
// SCRIPT PROMPTS
// -----------------------------
const SCRIPT_MAP = {
  Introduction:
    "Hi! I'm Jenny, your assistant. Let's get started. What is your first name?",
  LastName: "Great. Now please tell me your last name.",
  PhoneNumber:
    "Perfect. What is your phone number? Please speak the digits clearly.",
  City: "Thanks. Which city do you currently live in?",
  Pincode:
    "Almost done. What is your pin code? Say it clearly so I can understand.",
  Completion: "All fields have been captured. Would you like to submit now?",
};

const AZURE_TO_GLTF = {
  0: "",
  1: "Viseme_ID-001",
  2: "Viseme_ID-002",
  3: "Viseme_ID-003",
  4: "Viseme_ID-004",
  5: "Viseme_ID-005",
  6: "Viseme_ID-006",
  7: "Viseme_ID-007",
  8: "Viseme_ID-008",
  9: "Viseme_ID-009",
  10: "Viseme_ID-010",
  11: "Viseme_ID-011",
  12: "Viseme_ID-012",
  13: "Viseme_ID-013",
  14: "Viseme_ID-014",
  15: "Viseme_ID-015",
  16: "Viseme_ID-016",
  17: "Viseme_ID-017",
  18: "Viseme_ID-018",
  19: "Viseme_ID-019",
  20: "Viseme_ID-020",
  21: "Viseme_ID-021",
};

// -----------------------------
// MAIN COMPONENT
// -----------------------------
export const FaceV3 = forwardRef(
  ({ script, startListening, faceV3CallbackRef, ...props }, ref) => {
    // -----------------------------
    // LOAD MODEL
    // -----------------------------
    const { scene } = useGLTF("/models/face_morph.glb");
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

    // -----------------------------
    // REFS
    // -----------------------------
    const morphMeshesRef = useRef([]);
    const audioRef = useRef(null);
    const visemeTimelineRef = useRef([]);
    const frameRef = useRef(null);

    const promptIndexRef = useRef(0);
    const fetchingRef = useRef(false);
    const animationRunningRef = useRef(false);
    const [started, setStarted] = useState(false);
    const lastScriptRef = useRef(script);

    // -----------------------------
    // DETECT ALL MESHES WITH MORPH TARGETS
    // -----------------------------
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

    // -----------------------------
    // RESET HELPERS
    // -----------------------------
    function hardReset() {
      morphMeshesRef.current.forEach((m) => {
        if (m.morphTargetInfluences) {
          m.morphTargetInfluences.fill(0);
        }
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

    // -----------------------------
    // MAIN SMOOTH LIP SYNC ENGINE
    // -----------------------------
    function startVisemeAnimation() {
      if (!audioRef.current) return;
      animationRunningRef.current = true;

      const FADE_IN = 100;
      const FADE_OUT = 140;

      function animate() {
        if (!animationRunningRef.current) return;

        const currentMs = audioRef.current.currentTime * 1000;

        morphMeshesRef.current.forEach((mesh) => {
          const dict = mesh.morphTargetDictionary;
          const infl = mesh.morphTargetInfluences;
          if (!dict || !infl) return;

          // quick decay to avoid mouth stuck open
          for (let i = 0; i < infl.length; i++) {
            infl[i] = THREE.MathUtils.lerp(infl[i], 0, 0.25);
          }

          for (let v of visemeTimelineRef.current) {
            const t = currentMs - v.offset_ms;
            const dur = v.duration_ms;

            let s = 0;
            if (t >= 0 && t <= FADE_IN) s = t / FADE_IN;
            else if (t > FADE_IN && t < dur) s = 1;
            else if (t >= dur && t <= dur + FADE_OUT)
              s = 1 - (t - dur) / FADE_OUT;

            // Convert viseme_id → name → morph index
            const targetName = v.viseme_name;
            const idx = dict[targetName];

            if (idx !== undefined) {
              infl[idx] = Math.min(
                Math.max(infl[idx], THREE.MathUtils.lerp(infl[idx], s, 0.35)),
                1
              );
            }
          }
        });

        frameRef.current = requestAnimationFrame(animate);
      }

      animate();
    }

    // -----------------------------
    // STOP EVERYTHING
    // -----------------------------
    function forceStopAudioAndAnimation() {
      animationRunningRef.current = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch {}
      }
    }

    // -----------------------------
    // FETCH AUDIO + VISEMES
    // -----------------------------
    async function fetchVisemeData(text) {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/generate-viseme/?text=${encodeURIComponent(
            text
          )}`
        );

        const data = await res.json();
        const raw = data.visemes || [];

        // Build viseme timeline with computed durations
        visemeTimelineRef.current = raw.map((v, i) => {
          const next = raw[i + 1];
          return {
            viseme_id: v.viseme_id,
            viseme_name: AZURE_TO_GLTF[v.viseme_id], // <— IMPORTANT
            offset_ms: v.offset_ms,
            duration_ms: next ? next.offset_ms - v.offset_ms : 120,
          };
        });

        // Decode base64 audio
        const bytes = Uint8Array.from(atob(data.audio_file_base64), (c) =>
          c.charCodeAt(0)
        );
        const audioURL = URL.createObjectURL(
          new Blob([bytes], { type: data.mime_type || "audio/mpeg" })
        );

        forceStopAudioAndAnimation();

        const audio = new Audio(audioURL);
        audioRef.current = audio;

        // When audio finishes
        audio.onended = () => {
          animationRunningRef.current = false;

          // FIX: Force mouth close fully
          hardReset();
          smoothResetAll();

          fetchingRef.current = false;

          setTimeout(() => {
            if (typeof startListening === "function") startListening();
          }, 400);

          if (faceV3CallbackRef?.current) faceV3CallbackRef.current();
        };

        // Start animation + audio
        startVisemeAnimation();
        audio.play();
      } catch (err) {
        console.error("Viseme fetch error:", err);
        fetchingRef.current = false;
      }
    }

    // -----------------------------
    // PLAY SCRIPT PROMPT
    // -----------------------------
    function playNextPrompt() {
      const text = SCRIPT_MAP[script];
      if (!text) return;

      if (promptIndexRef.current >= 1) return;
      promptIndexRef.current = 1;

      fetchVisemeData(text);
    }

    // -----------------------------
    // START UI BUTTON
    // -----------------------------
    function handleStart() {
      promptIndexRef.current = 0;
      hardReset();
      setStarted(true);

      setTimeout(() => playNextPrompt(), 400);
    }

    // -----------------------------
    // SCRIPT CHANGE HANDLING
    // -----------------------------
    useEffect(() => {
      if (!started) return;
      if (script === lastScriptRef.current) return;

      lastScriptRef.current = script;

      promptIndexRef.current = 0;
      forceStopAudioAndAnimation();
      fetchingRef.current = false;

      setTimeout(() => playNextPrompt(), 250);
    }, [script, started]);

    // -----------------------------
    // CLEANUP ON UNMOUNT
    // -----------------------------
    useEffect(() => {
      return () => {
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

    // -----------------------------
    // FILTER FACE MESHES (Face041 family)
    // -----------------------------
    const faceMeshes = Object.values(nodes).filter(
      (n) => n.isSkinnedMesh && n.name.startsWith("Face041")
    );

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
      <>
        {!started && (
          <Html fullscreen className="pointer-events-auto">
            <div className="w-full h-full flex items-end justify-center pb-10">
              <div
                onClick={handleStart}
                className="cursor-pointer px-6 py-3 text-lg md:text-xl rounded-lg 
                bg-black/60 text-white border border-white/40 
                backdrop-blur-sm hover:bg-black/80 transition-all"
              >
                Click to Begin
              </div>
            </div>
          </Html>
        )}

        <group {...props} dispose={null} scale={4}>
          <group position={[-2, -130, 1.494]} scale={0.95}>
            <primitive object={nodes.pelvis} />
            <primitive object={nodes.neutral_bone} />

            {faceMeshes.map((mesh, idx) => (
              <skinnedMesh
                key={mesh.name || idx}
                geometry={mesh.geometry}
                skeleton={mesh.skeleton}
                morphTargetDictionary={mesh.morphTargetDictionary}
                morphTargetInfluences={mesh.morphTargetInfluences}
                material={
                  materials[mesh.material?.name] ?? Object.values(materials)[0]
                }
              />
            ))}
          </group>
        </group>
      </>
    );
  }
);

FaceV3.displayName = "FaceV3";
export default FaceV3;

useGLTF.preload("/models/face_morph.glb");
