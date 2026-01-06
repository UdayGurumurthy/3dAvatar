import React, {
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
// import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

const AZURE_TO_GLTF = {
  0: "Viseme_ID-000",
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

export const FullCharactor = forwardRef((props, ref) => {
  const group = useRef();

  const { scene, animations } = useGLTF("/models/FullCharactorV4.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  // const { nodes, materials } = useGraph(clone);
  const { actions, names } = useAnimations(animations, group);

  const morphMeshesRef = useRef([]);
  const audioRef = useRef(null);
  const visemeTimelineRef = useRef([]);
  const frameRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const audioStartTimeRef = useRef(0);

  useEffect(() => {
    if (!animations) return;
    animations.forEach((clip) => {
      clip.tracks = clip.tracks.filter(
        (t) =>
          !t.name.includes("morphTargetInfluences") &&
          !t.name.toLowerCase().includes("face")
      );
    });
  }, [animations]);

  useEffect(() => {
    const meshes = [];
    clone.traverse((o) => {
      if (o.isMesh && o.morphTargetDictionary) {
        o.morphTargetInfluences.fill(0);
        meshes.push(o);
      }
    });
    morphMeshesRef.current = meshes;

    // ⏳ wait 10 seconds, then hide loader
    const timer = setTimeout(() => {
      props.setShowLoader(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [clone]);

  useEffect(() => {
    if (!actions || !names.length) return;
    const action = actions[names[0]];
    if (!action) return;
    action.reset();
    action.time = 0.5;
    action.fadeIn(0.5).play();
  }, [actions, names]);

  function stopAll() {
    isSpeakingRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    morphMeshesRef.current.forEach((m) => m.morphTargetInfluences.fill(0));
  }

  function startVisemes() {
    if (!audioRef.current) return;
    isSpeakingRef.current = true;

    const FADE_IN = 110;
    const FADE_OUT = 110;
    const MAX = 0.65;
    const SMOOTHING = 0.55;

    const animate = () => {
      if (!isSpeakingRef.current || !audioRef.current) return;

      const AUDIO_LATENCY_MS = 120; // tune 70–120
      const now =
        performance.now() - audioStartTimeRef.current - AUDIO_LATENCY_MS;

      morphMeshesRef.current.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const infl = mesh.morphTargetInfluences;
        if (!dict || !infl) return;

        // 1️⃣ Create target buffer
        const target = new Float32Array(infl.length);

        // 2️⃣ Accumulate viseme strengths
        for (const v of visemeTimelineRef.current) {
          const t = now - v.offset_ms;
          if (t < -FADE_IN || t > v.duration_ms + FADE_OUT) continue;

          let s = 0;
          if (t >= 0 && t <= FADE_IN) {
            s = THREE.MathUtils.smoothstep(t / FADE_IN, 0, 1);
          } else if (t > FADE_IN && t < v.duration_ms) {
            s = 1;
          } else if (t >= v.duration_ms) {
            s =
              1 -
              THREE.MathUtils.smoothstep((t - v.duration_ms) / FADE_OUT, 0, 1);
          }

          const idx = dict[v.viseme_name];
          if (idx !== undefined) {
            target[idx] = Math.max(target[idx], s * MAX);
          }
        }

        // 3️⃣ Smoothly blend current → target
        for (let i = 0; i < infl.length; i++) {
          infl[i] = THREE.MathUtils.lerp(infl[i], target[i], SMOOTHING);
        }
      });

      frameRef.current = requestAnimationFrame(animate);
      props.setIsLoading(false);
    };

    animate();
    props.setIsCompleted(false);
  }

  async function speak(text) {
    props.setIsLoading(true);
    if (!text) return;
    stopAll();

    const res = await fetch(
      "https://avatar-dev-api.dtskill.com/api/generate-viseme/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }
    );
    if (!res.ok) return;

    const data = await res.json();
    visemeTimelineRef.current = (data.visemes || []).map((v, i, arr) => ({
      viseme_name: AZURE_TO_GLTF[v.viseme_id],
      offset_ms: v.offset_ms,
      duration_ms: arr[i + 1]?.offset_ms - v.offset_ms || 120,
    }));

    const bytes = Uint8Array.from(atob(data.audio_file_base64), (c) =>
      c.charCodeAt(0)
    );
    const audioURL = URL.createObjectURL(
      new Blob([bytes], { type: data.mime_type || "audio/mpeg" })
    );

    audioRef.current = new Audio(audioURL);
    audioRef.current.onended = stopAll;

    // FIX: Set start time immediately before playing
    audioStartTimeRef.current = performance.now();
    audioRef.current.play();
    startVisemes(); // Start animation loop immediately

    if (actions["Talking"]) {
      actions["Talking"].reset().fadeIn(0.2).play();
    }
  }

  useImperativeHandle(ref, () => ({ speak }));

  return (
    <group
      ref={group}
      {...props}
      dispose={null}
      scale={300}
      position={[0, -400, 1.104]}
    >
      <primitive object={clone} />
    </group>
  );
});

FullCharactor.displayName = "FullCharactor";
useGLTF.preload("/models/FullCharactorV4.glb");
