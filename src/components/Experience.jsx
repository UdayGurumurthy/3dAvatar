// src/components/Experience.jsx
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useTexture,
} from "@react-three/drei";
import { FaceV2 } from "./FaceV2";
import { FaceV3 } from "./FaceV3";
import { FaceAnimation } from "./FaceAnimation";
import { FullCharactor } from "./FullCharactor";
import { useThree } from "@react-three/fiber";

export const Experience = ({
  script,
  faceRef,
  startListening,
  faceV2CallbackRef,
  setIsLoading,
  setIsCompleted,
  setShowLoader,
  showLoader,
}) => {
  const texture = useTexture("/frontDesk.png");
  const viewport = useThree((state) => state.viewport);
  return (
    <>
      <OrbitControls enableZoom={false} enableRotate={false} />
      <PerspectiveCamera makeDefault position={[0, 0, 450]} fov={30} />

      {/* <FaceV3
        position={[2, -580, 0]}
        scale={10}
        script={script}
        startListening={startListening}
        faceV2CallbackRef={faceV2CallbackRef}
      /> */}
      {/* <FaceV3
        position={[5, -20, 0]}
        scale={40}
        script={script}
        startListening={startListening}
        faceV2CallbackRef={faceV2CallbackRef}
      /> */}
      <FullCharactor
        script={script}
        startListening={startListening}
        faceV2CallbackRef={faceV2CallbackRef}
        setIsLoading={setIsLoading}
        setIsCompleted={setIsCompleted}
        setShowLoader={setShowLoader}
        showLoader={showLoader}
      />
      {/* <FaceAnimation
        position={[5, -400, 0]}
        scale={300}
        script={script}
        startListening={startListening}
        faceV2CallbackRef={faceV2CallbackRef}
      /> */}

      <Environment preset="warehouse" />
      <mesh>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </>
  );
};

export default Experience;
