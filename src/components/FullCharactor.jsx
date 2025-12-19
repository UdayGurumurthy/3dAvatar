import React, {
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useControls } from "leva";

const STATIC_MODEL =
  "https://avatar-main.s3.ap-south-1.amazonaws.com/face-yes+viseme+updated.glb";

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

export const FullCharactor = forwardRef(
  (
    { modelUrl, setShowLoader, setIsLoading, setIsCompleted, ...props },
    ref
  ) => {
    const group = useRef();

    const glbPath = modelUrl || STATIC_MODEL;
    const { scene, animations } = useGLTF(glbPath);

    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

    const clonedAnimations = useMemo(
      () => (animations ? animations.map((a) => a.clone()) : []),
      [animations]
    );

    const { actions, names } = useAnimations(clonedAnimations, group);

    const morphMeshesRef = useRef([]);
    const audioRef = useRef(null);
    const visemeTimelineRef = useRef([]);
    const frameRef = useRef(null);
    const isSpeakingRef = useRef(false);

    const hasAnimations = names.length > 0;

    const hasMorphTargets = useMemo(() => {
      let found = false;
      clone.traverse((o) => {
        if (
          o.isMesh &&
          o.morphTargetDictionary &&
          Object.keys(o.morphTargetDictionary).length
        ) {
          found = true;
        }
      });
      return found;
    }, [clone]);

    const avatarControls = useControls("Avatar", {
      position: { value: { x: 0, y: -400, z: 1.104 }, step: 0.1 },
      rotation: { value: { x: 0, y: 0, z: 0 }, step: 0.01 },
      scale: { value: 300, min: 1, max: 1000, step: 1 },
    });

    const animationControls = useControls(
      "Animations",
      hasAnimations
        ? {
            play: { value: true },
            clip: { options: names, value: names[0] },
            speed: { value: 1, min: 0.1, max: 3, step: 0.1 },
          }
        : {},
      [names.join(",")]
    );

    const visemeControls = useControls("Viseme Tuning", {
      fadeIn: { value: 140, min: 0, max: 500, step: 1 },
      fadeOut: { value: 220, min: 0, max: 500, step: 1 },
      maxStrength: { value: 0.5, min: 0, max: 1, step: 0.01 },
      smoothing: { value: 0.55, min: 0, max: 1, step: 0.01 },
    });

    useEffect(() => {
      if (!hasAnimations) return;
      Object.values(actions).forEach((a) => a.stop());
      if (animationControls.play && animationControls.clip) {
        const action = actions[animationControls.clip];
        action
          ?.reset()
          .setEffectiveTimeScale(animationControls.speed)
          .fadeIn(0.3)
          .play();
      }
    }, [
      animationControls.play,
      animationControls.clip,
      animationControls.speed,
      hasAnimations,
      actions,
    ]);

    useEffect(() => {
      const meshes = [];
      clone.traverse((o) => {
        if (o.isMesh && o.morphTargetDictionary) {
          o.morphTargetInfluences.fill(0);
          meshes.push(o);
        }
      });
      morphMeshesRef.current = meshes;
      const timer = setTimeout(() => setShowLoader(false), 5000);
      return () => clearTimeout(timer);
    }, [clone, setShowLoader]);

    const morphNames = useMemo(() => {
      const set = new Set();
      morphMeshesRef.current.forEach((m) =>
        Object.keys(m.morphTargetDictionary || {}).forEach((k) => set.add(k))
      );
      return Array.from(set);
    }, [clone]);

    const morphControls = useControls(
      "Morph Targets",
      hasMorphTargets
        ? morphNames.reduce((acc, name) => {
            acc[name] = { value: 0, min: 0, max: 1, step: 0.01 };
            return acc;
          }, {})
        : {},
      [morphNames.join(",")]
    );

    useEffect(() => {
      if (!hasMorphTargets || isSpeakingRef.current) return;
      morphMeshesRef.current.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const infl = mesh.morphTargetInfluences;
        Object.entries(dict).forEach(([name, idx]) => {
          if (morphControls[name] !== undefined) {
            infl[idx] = morphControls[name];
          }
        });
      });
    }, [morphControls, hasMorphTargets]);

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

      const FADE_IN = visemeControls.fadeIn;
      const FADE_OUT = visemeControls.fadeOut;
      const MAX = visemeControls.maxStrength;
      const SMOOTHING = visemeControls.smoothing;

      const animate = () => {
        if (!isSpeakingRef.current || !audioRef.current) return;

        const now = audioRef.current.currentTime * 1000;

        morphMeshesRef.current.forEach((mesh) => {
          const dict = mesh.morphTargetDictionary;
          const infl = mesh.morphTargetInfluences;
          const target = new Float32Array(infl.length);

          for (const v of visemeTimelineRef.current) {
            const t = now - v.offset_ms;
            if (t < -FADE_IN || t > v.duration_ms + FADE_OUT) continue;

            let s = 0;
            if (t <= FADE_IN) s = t / FADE_IN;
            else if (t < v.duration_ms) s = 1;
            else s = 1 - (t - v.duration_ms) / FADE_OUT;

            const idx = dict[v.viseme_name];
            if (idx !== undefined) {
              target[idx] = Math.max(target[idx], s * MAX);
            }
          }

          for (let i = 0; i < infl.length; i++) {
            infl[i] = THREE.MathUtils.lerp(infl[i], target[i], SMOOTHING);
          }
        });

        frameRef.current = requestAnimationFrame(animate);
        setIsLoading(false);
      };

      animate();
      setIsCompleted(false);
    }

    async function speak(text) {
      setIsLoading(true);
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

      visemeTimelineRef.current = data.visemes.map((v, i, arr) => ({
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

      startVisemes();
      audioRef.current.play();
    }

    useImperativeHandle(ref, () => ({ speak }));

    return (
      <group
        ref={group}
        dispose={null}
        position={[
          avatarControls.position.x,
          avatarControls.position.y,
          avatarControls.position.z,
        ]}
        rotation={[
          avatarControls.rotation.x,
          avatarControls.rotation.y,
          avatarControls.rotation.z,
        ]}
        scale={avatarControls.scale}
        {...props}
      >
        <primitive object={clone} />
      </group>
    );
  }
);

FullCharactor.displayName = "FullCharactor";
useGLTF.preload(STATIC_MODEL);
