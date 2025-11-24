import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function MetaHumanAvatar() {
  const group = useRef();
  const gltf = useLoader(GLTFLoader, "/meta_human.glb");

  const listener = useRef(new THREE.AudioListener());
  const sound = useRef();
  const analyser = useRef();
  const mouthIndex = useRef(null);

  useEffect(() => {
    const scene = gltf.scene;
    group.current.add(scene);

    // Attach audio listener
    const audio = new THREE.Audio(listener.current);
    const loader = new THREE.AudioLoader();

    loader.load("/voice.mp3", (buffer) => {
      audio.setBuffer(buffer);
      audio.play();
    });

    analyser.current = new THREE.AudioAnalyser(audio, 32);
    sound.current = audio;

    // Find morph target index for mouth open
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        mouthIndex.current = child.morphTargetDictionary["mouthOpen"];
      }
    });
  }, [gltf]);

  useFrame(() => {
    if (!group.current || !analyser.current) return;

    const volume = analyser.current.getAverageFrequency() / 256;
    group.current.traverse((child) => {
      if (
        child.isMesh &&
        child.morphTargetInfluences &&
        mouthIndex.current !== null
      ) {
        child.morphTargetInfluences[mouthIndex.current] = volume * 1.2;
      }
      if (child.name === "Head") {
        child.rotation.y = Math.sin(Date.now() * 0.001) * 0.05;
        child.rotation.x = Math.sin(Date.now() * 0.0005) * 0.03;
      }
    });
  });

  return <primitive ref={group} object={gltf.scene} />;
}
