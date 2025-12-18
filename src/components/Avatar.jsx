import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  Suspense,
  useMemo,
} from "react";

import { Html, useGLTF } from "@react-three/drei";
import { useGraph, useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

export const FaceV2 = forwardRef(
  ({ scriptStatus, startListening, script, ...props }, ref) => {
    // MODEL + MORPHS
    const { scene } = useGLTF("/models/FaceV2_draco.glb");
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes, materials } = useGraph(clone);

    const morphMeshesRef = useRef([]);
    const audioRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioPlayedRef = useRef(false);

    const lipsyncRef = useRef(null);
    const [lipsync, setLipsync] = useState(null);

    const visemeTimelineRef = useRef([]);
    const animationRunningRef = useRef(false);
    const frameRef = useRef(null);

    const [started, setStarted] = useState(false);

    // COLLECT MORPH TARGETS
    useEffect(() => {
      const meshes = [];

      clone.traverse((obj) => {
        if (obj.isMesh && obj.morphTargetDictionary) {
          meshes.push(obj);
          obj.morphTargetInfluences?.fill(0);
        }
      });

      morphMeshesRef.current = meshes;
      console.log("MORPH TARGETS COLLECTED:", meshes.length);
    }, [clone]);

    // Load JSON lipsync data when script changes
    useEffect(() => {
      if (!script) return;

      fetch(`/audio/${script}.json`)
        .then((res) => res.json())
        .then((data) => {
          lipsyncRef.current = data;
          setLipsync(data);
          console.log("Lipsync data loaded");
        })
        .catch((err) => console.error("Error loading lipsync:", err));
    }, [script]);

    // Viseme mapping
    const corresponding = {
      A: "viseme_aa",
      B: "viseme_PP",
      C: "viseme_SS",
      D: "viseme_DD",
      E: "viseme_E",
      F: "viseme_FF",
      G: "viseme_kk",
      H: "viseme_TH",
      I: "viseme_I",
      J: "viseme_CH",
      K: "viseme_kk",
      L: "viseme_nn",
      M: "viseme_PP",
      N: "viseme_nn",
      O: "viseme_O",
      P: "viseme_PP",
      Q: "viseme_kk",
      R: "viseme_RR",
      S: "viseme_SS",
      T: "viseme_DD",
      U: "viseme_U",
      V: "viseme_FF",
      W: "viseme_O",
      X: "viseme_sil",
      Y: "viseme_I",
      Z: "viseme_SS",
    };

    const visemeTimeline = useMemo(() => {
      if (!lipsync) return [];
      return lipsync.mouthCues.map((cue) => ({
        start: cue.start,
        end: cue.end,
        viseme: corresponding[cue.value],
      }));
    }, [lipsync]);

    // Initialize AudioContext
    useEffect(() => {
      const unlockAudio = () => {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            window.webkitAudioContext)();
        }
        if (audioContextRef.current?.state === "suspended") {
          audioContextRef.current.resume().then(() => {
            console.log("AudioContext resumed");
          });
        }
      };

      window.addEventListener("pointerdown", unlockAudio, { once: true });
      window.addEventListener("click", unlockAudio, { once: true });
      window.addEventListener("keydown", unlockAudio, { once: true });

      return () => {
        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
      };
    }, []);

    // Initialize audio element
    useEffect(() => {
      audioPlayedRef.current = false;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (!script) return;

      const audio = new Audio();
      audio.src = `/audio/${script}.mp3`;
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";

      audioRef.current = audio;

      return () => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      };
    }, [script]);

    // IMMEDIATE HARD RESET
    function hardReset() {
      const meshes = morphMeshesRef.current;
      meshes.forEach((m) => {
        if (!m.morphTargetInfluences) return;
        for (let i = 0; i < m.morphTargetInfluences.length; i++) {
          m.morphTargetInfluences[i] = 0;
        }
      });
    }

    // Handle audio playback
    useEffect(() => {
      if (!audioRef.current || !visemeTimeline.length) return;

      audioPlayedRef.current = false;

      const playAudio = () => {
        if (audioPlayedRef.current || !audioRef.current) return;
        audioPlayedRef.current = true;

        try {
          audioRef.current.currentTime = 0;
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("🎵 Audio started playing");
                animationRunningRef.current = true;
              })
              .catch((err) => {
                console.error("Error playing audio:", err);
                audioPlayedRef.current = false;
              });
          }
        } catch (err) {
          console.error("Error initiating audio playback:", err);
          audioPlayedRef.current = false;
        }
      };

      // Try to play immediately
      if (audioRef.current.readyState >= 2) {
        console.log("Audio ready, playing now");
        playAudio();
      } else {
        console.log("Waiting for audio to load...");
        const handleCanPlay = () => {
          console.log("Audio can play, triggering playback");
          playAudio();
        };
        audioRef.current.addEventListener("canplay", handleCanPlay, {
          once: true,
        });

        return () => {
          audioRef.current?.removeEventListener("canplay", handleCanPlay);
        };
      }
    }, [script, visemeTimeline.length]);

    // Handle audio end
    useEffect(() => {
      if (!audioRef.current) return;

      const handleAudioEnd = () => {
        console.log("🎵 Audio ended");
        animationRunningRef.current = false;
        hardReset();

        // Start listening after audio ends
        setTimeout(() => {
          if (startListening) {
            startListening();
          }
        }, 200);
      };

      const audio = audioRef.current;
      audio.addEventListener("ended", handleAudioEnd);

      return () => {
        audio.removeEventListener("ended", handleAudioEnd);
      };
    }, [startListening]);

    // Expose global controls
    useEffect(() => {
      window.playAudio = () => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) =>
              console.error("Error playing audio:", err)
            );
          }
          console.log("Audio playing");
        }
      };

      window.stopAudio = () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          console.log("Audio stopped");
        }
      };

      window.restartAudio = () => {
        const confirmed = window.confirm(
          "Refreshing will reset all data. Do you want to continue?"
        );
        if (confirmed) {
          window.location.reload();
        }
      };
    }, []);

    // START
    const handleStart = () => {
      setStarted(true);
      hardReset();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("🎵 Audio started playing");
              animationRunningRef.current = true;
            })
            .catch((err) => {
              console.error("Error playing audio:", err);
              audioPlayedRef.current = false;
            });
        }
      }
    };

    // useFrame for viseme rendering
    useFrame(() => {
      if (!audioRef.current || !animationRunningRef.current) return;

      const t = audioRef.current.currentTime || 0;

      // Find matching viseme from timeline
      const cue = visemeTimeline.find((v) => t >= v.start && t < v.end);
      const activeViseme = cue ? cue.viseme : null;

      morphMeshesRef.current.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const infl = mesh.morphTargetInfluences;
        if (!dict) return;

        Object.keys(dict).forEach((key) => {
          const idx = dict[key];
          if (idx === undefined) return;
          const target = key === activeViseme ? 1 : 0;
          infl[idx] = THREE.MathUtils.lerp(infl[idx], target, 0.15);
        });
      });
    });

    // RENDER
    return (
      <>
        {!started && (
          <Html center>
            <div
              style={{
                padding: "20px 35px",
                background: "rgba(0,0,0,0.5)",
                color: "#fff",
                borderRadius: "12px",
                fontSize: "22px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={handleStart}
            >
              ▶ Click to Begin
            </div>
          </Html>
        )}

        <Suspense fallback={<>Loading…</>}>
          <group {...props} scale={4}>
            <primitive object={nodes.pelvis} />
            <primitive object={nodes.neutral_bone} />

            {Array.from({ length: 9 }).map((_, i) => {
              const name = `Face_${i + 1}`;
              return (
                <skinnedMesh
                  key={name}
                  name={name}
                  geometry={nodes[name].geometry}
                  skeleton={nodes[name].skeleton}
                  material={
                    materials[nodes[name].material?.name] ||
                    Object.values(materials)[i]
                  }
                  morphTargetDictionary={nodes[name].morphTargetDictionary}
                  morphTargetInfluences={nodes[name].morphTargetInfluences}
                />
              );
            })}
          </group>
        </Suspense>
      </>
    );
  }
);

useGLTF.preload("/models/FaceV2_draco.glb");
