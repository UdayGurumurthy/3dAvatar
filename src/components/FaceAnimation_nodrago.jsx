import React, { useEffect, useRef, useMemo } from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

export function FaceAnimation_nodrago(props) {
  const group = useRef();

  const { scene, animations } = useGLTF("/models/FacewithAnimation.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);

  const { actions, names } = useAnimations(animations, group);

  // ▶️ PLAY ANIMATION
  useEffect(() => {
    if (!actions || !names.length) return;

    const action = actions[names[0]]; // first animation
    action.reset().fadeIn(0.3).play();

    return () => action.fadeOut(0.3);
  }, [actions, names]);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="Face" position={[0, 0, -0.001]} scale={0.01}>
          <group name="root001">
            <primitive object={nodes.pelvis} />
            <group name="Face001">
              {[
                "Face_1",
                "Face_2",
                "Face_3",
                "Face_4",
                "Face_5",
                "Face_6",
                "Face_7",
                "Face_8",
                "Face_9",
              ].map((name) => (
                <skinnedMesh
                  key={name}
                  name={name}
                  geometry={nodes[name].geometry}
                  material={nodes[name].material}
                  skeleton={nodes[name].skeleton}
                  morphTargetDictionary={nodes[name].morphTargetDictionary}
                  morphTargetInfluences={nodes[name].morphTargetInfluences}
                />
              ))}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/FacewithAnimation.glb");
