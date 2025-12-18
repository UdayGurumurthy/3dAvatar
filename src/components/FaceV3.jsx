import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useMemo,
  useImperativeHandle,
} from "react";
import { useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useQueryParam } from "../hooks/useQueryParams";

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

export const FaceV3 = forwardRef(({ startListening, ...props }, ref) => {
  const { scene } = useGLTF("/models/face_morph.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);

  const [sessionId, setSessionId] = useQueryParam("session_id");

  const morphMeshesRef = useRef([]);
  const audioRef = useRef(null);
  const visemeTimelineRef = useRef([]);
  const frameRef = useRef(null);
  const fetchingRef = useRef(false);
  const animationRunningRef = useRef(false);

  useEffect(() => {
    const meshes = [];
    clone.traverse((obj) => {
      if (obj.isMesh && obj.morphTargetDictionary) {
        meshes.push(obj);
        obj.morphTargetInfluences?.fill(0);
      }
    });
    morphMeshesRef.current = meshes;
  }, [clone]);

  function resetMorphs() {
    morphMeshesRef.current.forEach((m) => m.morphTargetInfluences?.fill(0));
  }

  function stopAll() {
    animationRunningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    resetMorphs();
  }

  function startVisemes() {
    animationRunningRef.current = true;

    const FADE_IN = 140;
    const FADE_OUT = 200;
    const MAX_STRENGTH = 0.5;
    const DECAY = 0.12;

    function animate() {
      if (!animationRunningRef.current || !audioRef.current) return;

      const currentMs = audioRef.current.currentTime * 1000;

      morphMeshesRef.current.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const infl = mesh.morphTargetInfluences;
        if (!dict || !infl) return;

        for (let i = 0; i < infl.length; i++) {
          infl[i] = THREE.MathUtils.lerp(infl[i], 0, DECAY);
        }

        for (const v of visemeTimelineRef.current) {
          const t = currentMs - v.offset_ms;
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
            infl[idx] = Math.max(infl[idx], s * MAX_STRENGTH);
          }
        }
      });

      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
  }

  async function speak(text) {
    if (fetchingRef.current || !text) return;
    fetchingRef.current = true;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/generate-viseme/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          ...(sessionId && { session_id: sessionId }),
        }),
      });

      if (!res.ok) {
        throw new Error(`API failed: ${res.status}`);
      }

      const data = await res.json();
      setSessionId(data.session_id);

      const raw = data.visemes || [];

      visemeTimelineRef.current = raw.map((v, i) => ({
        viseme_name: AZURE_TO_GLTF[v.viseme_id],
        offset_ms: v.offset_ms,
        duration_ms: raw[i + 1] ? raw[i + 1].offset_ms - v.offset_ms : 120,
      }));

      const bytes = Uint8Array.from(atob(data.audio_file_base64), (c) =>
        c.charCodeAt(0)
      );

      const audioURL = URL.createObjectURL(
        new Blob([bytes], { type: data.mime_type || "audio/mpeg" })
      );

      stopAll();

      audioRef.current = new Audio(audioURL);
      audioRef.current.onended = () => {
        stopAll();
        fetchingRef.current = false;
      };

      startVisemes();
      audioRef.current.play();
    } catch (e) {
      console.error("Speak API error:", e);
      fetchingRef.current = false;
    }
  }

  useImperativeHandle(ref, () => ({ speak }), []);

  const faceMeshes = Object.values(nodes).filter(
    (n) => n.isSkinnedMesh && n.name.startsWith("Face041")
  );

  return (
    <group {...props} dispose={null} scale={4}>
      <group position={[-2, -130, 1.494]} scale={0.95}>
        <primitive object={nodes.pelvis} />
        <primitive object={nodes.neutral_bone} />
        {faceMeshes.map((mesh) => (
          <skinnedMesh
            key={mesh.uuid}
            geometry={mesh.geometry}
            skeleton={mesh.skeleton}
            morphTargetDictionary={mesh.morphTargetDictionary}
            morphTargetInfluences={mesh.morphTargetInfluences}
            material={materials[mesh.material?.name]}
          />
        ))}
      </group>
    </group>
  );
});

FaceV3.displayName = "FaceV3";
export default FaceV3;

useGLTF.preload("/models/face_morph.glb");
