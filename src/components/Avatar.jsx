import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useGraph } from "@react-three/fiber";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { useMemo } from "react";

export function Avatar(props) {
  const { scene } = useGLTF("/models/691443b385874cf6af4562ce.glb");
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);

  const [modelInitialized, setModelInitialized] = useState(false);
  const [animation, setAnimation] = useState("Idle");

  // Animation setup
  const { animations: IdleAnimation } = useFBX("/animations/Idle.fbx");
  const { animations: AngryAnimation } = useFBX("/animations/Angry.fbx");
  const { animations: GreetingAnimation } = useFBX("/animations/Greeting.fbx");
  const { animations: ThinkingAnimation } = useFBX("/animations/Thinking.fbx");
  const { animations: ThankFulAnimation } = useFBX("/animations/Thankful.fbx");

  IdleAnimation[0].name = "Idle";
  AngryAnimation[0].name = "Angry";
  GreetingAnimation[0].name = "Greeting";
  ThinkingAnimation[0].name = "Thinking";
  ThankFulAnimation[0].name = "Thankful";

  const retargetAnimations = (animations) => {
    return animations.map((clip) => {
      const newTracks = [];
      clip.tracks.forEach((track) => {
        let newTrackName = track.name;
        newTrackName = newTrackName.replace(/^mixamorig/, "");
        const newTrack = track.clone();
        newTrack.name = newTrackName;
        newTracks.push(newTrack);
      });
      const newClip = new THREE.AnimationClip(
        clip.name,
        clip.duration,
        newTracks
      );
      return newClip;
    });
  };

  const retargetedIdle = retargetAnimations(IdleAnimation);
  const retargetedAngry = retargetAnimations(AngryAnimation);
  const retargetedGreeting = retargetAnimations(GreetingAnimation);
  const retargetedThinking = retargetAnimations(ThinkingAnimation);
  const retargetedThankfull = retargetAnimations(ThankFulAnimation);

  const group = useRef();
  const { actions } = useAnimations(
    [
      retargetedIdle[0],
      retargetedGreeting[0],
      retargetedAngry[0],
      retargetedThinking[0],
      retargetedThankfull[0],
    ],
    group
  );

  // Audio setup
  const audioContextRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioPlayedRef = useRef(false);

  // Store lipsync data in ref to avoid reloading model
  const lipsyncRef = useRef(null);
  const [lipsync, setLipsync] = useState(null);

  // Load JSON only when script changes (without useLoader to prevent model reload)
  useEffect(() => {
    fetch(`/audio/${props.script}.json`)
      .then((res) => res.json())
      .then((data) => {
        lipsyncRef.current = data;
        setLipsync(data);
      })
      .catch((err) => console.error("Error loading lipsync:", err));
  }, [props.script]);

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

  // Initialize model with Idle animation
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      if (actions["Idle"]) {
        actions["Idle"].reset().fadeIn(0.5).play();
      }
      setModelInitialized(true);
    }
  }, [actions]);

  // Handle animation changes
  useEffect(() => {
    if (!actions || !actions[animation]) {
      console.warn(
        `Animation "${animation}" not found. Available:`,
        Object.keys(actions || {})
      );
      return;
    }

    Object.keys(actions).forEach((key) => {
      if (key !== animation) {
        actions[key]?.fadeOut(0.5);
      }
    });

    const action = actions[animation];
    action.reset().fadeIn(0.5).play();
  }, [animation, actions]);

  // Initialize audio element only when script changes
  useEffect(() => {
    audioPlayedRef.current = false;

    // Stop old audio
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }

    // Create audio
    const audio = new Audio();
    audio.src = `/audio/${props.script}.mp3`;
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";

    // Create AudioContext if missing
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    // Store audio element
    audioElementRef.current = audio;

    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [props.script]); // Only depends on script change

  // 🔥 IMPORTANT: unlock autoplay after first click/touch
  useEffect(() => {
    const unlockAudio = () => {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume().then(() => {
          console.log("AudioContext resumed for autoplay");
        });
      }
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
    };
  }, []);

  // Handle audio playback when model is ready
  useEffect(() => {
    if (!audioElementRef.current) {
      return;
    }

    // Reset played flag for new script
    audioPlayedRef.current = false;

    const playAudio = () => {
      if (audioPlayedRef.current || !audioElementRef.current) return;
      audioPlayedRef.current = true;

      try {
        audioElementRef.current.currentTime = 0;
        const playPromise = audioElementRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio started playing");
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
    if (audioElementRef.current.readyState >= 2) {
      console.log("Audio ready, playing now");
      playAudio();
    } else {
      console.log("Waiting for audio to load...");
      const handleCanPlay = () => {
        console.log("Audio can play, triggering playback");
        playAudio();
      };
      audioElementRef.current.addEventListener("canplay", handleCanPlay, {
        once: true,
      });

      return () => {
        audioElementRef.current?.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, [props.script]); // Only depends on script change

  useEffect(() => {
    const unlockAudio = () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state === "suspended"
      ) {
        audioContextRef.current.resume().then(() => {
          console.log("🔓 AudioContext unlocked");
        });
      }

      // also try autoplay again once unlocked
      if (audioElementRef.current) {
        audioElementRef.current.play().catch(() => {});
      }
    };

    // pointerdown = click/tap
    window.addEventListener("pointerdown", unlockAudio, { once: true });

    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, []);

  // Handle audio end
  useEffect(() => {
    if (!audioElementRef.current) return;

    const handleAudioEnd = () => {
      console.log("Audio ended");
      if (props.startListening) {
        props.startListening();
        setAnimation("Thinking");
      }
    };

    setAnimation("Idle");
    const audio = audioElementRef.current;
    audio.addEventListener("ended", handleAudioEnd);

    return () => {
      audio.removeEventListener("ended", handleAudioEnd);
    };
  }, [props.startListening]);

  // Expose global controls
  useEffect(() => {
    window.playAudio = () => {
      if (audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
        const playPromise = audioElementRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) =>
            console.error("Error playing audio:", err)
          );
        }
        console.log("Audio playing");
      }
    };

    window.stopAudio = () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        console.log("Audio stopped");
      }
    };

    window.setAnimation = (animName) => {
      setAnimation(animName);
      console.log("Animation set to:", animName);
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

  // Blink animation
  const blinkRef = useRef({ nextBlink: 0, isBlinking: false });

  useFrame(() => {
    if (!audioElementRef.current) return;

    const head = nodes.Wolf3D_Head;
    const teeth = nodes.Wolf3D_Teeth;
    const eyeLeft = nodes.EyeLeft;
    const eyeRight = nodes.EyeRight;

    if (!head || !teeth) return;

    const headDict = head.morphTargetDictionary;
    const teethDict = teeth.morphTargetDictionary;
    const eyeLeftDict = eyeLeft?.morphTargetDictionary;
    const eyeRightDict = eyeRight?.morphTargetDictionary;

    if (!headDict || !teethDict) return;

    const t = audioElementRef.current.currentTime || 0;

    // Find matching viseme
    const cue = visemeTimeline.find((v) => t >= v.start && t < v.end);
    const activeViseme = cue ? cue.viseme : null;

    // Blink logic
    if (t >= blinkRef.current.nextBlink && !blinkRef.current.isBlinking) {
      blinkRef.current.isBlinking = true;
      blinkRef.current.blinkStart = t;
    }

    const blinkDuration = 0.15;
    const timeSinceBlink = t - (blinkRef.current.blinkStart || 0);
    let blinkAmount = 0;

    if (blinkRef.current.isBlinking) {
      if (timeSinceBlink < blinkDuration) {
        blinkAmount = Math.sin((timeSinceBlink / blinkDuration) * Math.PI);
      } else {
        blinkRef.current.isBlinking = false;
        blinkRef.current.nextBlink = t + (2 + Math.random() * 3);
        blinkAmount = 0;
      }
    }

    // Apply morphs to head
    Object.keys(headDict).forEach((key) => {
      const idx = headDict[key];
      if (idx === undefined) return;
      const target = key === activeViseme ? 1 : 0;
      head.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
        head.morphTargetInfluences[idx],
        target,
        0.15
      );
    });

    // Apply morphs to teeth
    Object.keys(teethDict).forEach((key) => {
      const idx = teethDict[key];
      if (idx === undefined) return;
      const target = key === activeViseme ? 1 : 0;
      teeth.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
        teeth.morphTargetInfluences[idx],
        target,
        0.15
      );
    });

    // Apply blink to eyes
    if (eyeLeftDict && eyeRightDict) {
      const blinkKey = Object.keys(eyeLeftDict).find(
        (key) => key.includes("blink") || key.includes("Blink")
      );

      if (blinkKey) {
        const eyeLeftIdx = eyeLeftDict[blinkKey];
        const eyeRightIdx = eyeRightDict[blinkKey];

        if (eyeLeftIdx !== undefined && eyeRightIdx !== undefined) {
          eyeLeft.morphTargetInfluences[eyeLeftIdx] = blinkAmount;
          eyeRight.morphTargetInfluences[eyeRightIdx] = blinkAmount;
        }
      }
    }
  });

  // Allow autoplay by resuming AudioContext after first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
        console.log("AudioContext resumed");
      }
    };

    window.addEventListener("click", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const handleModelClick = (e) => {
    e.stopPropagation();
    console.log("Model clicked");
  };

  return (
    <group {...props} dispose={null} ref={group} onClick={handleModelClick}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Glasses.geometry}
        material={materials.Wolf3D_Glasses}
        skeleton={nodes.Wolf3D_Glasses.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

useGLTF.preload("/models/691443b385874cf6af4562ce.glb");
