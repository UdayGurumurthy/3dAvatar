// src/components/Experience.jsx
import { Environment, OrbitControls, PerspectiveCamera, useTexture } from "@react-three/drei";
import { FaceV2 } from "./FaceV2";
import { FaceV3 } from "./FaceV3";
import { useThree } from "@react-three/fiber";
import { FullCharactor } from "./FullCharactor";

export const Experience = ({
  script,
  faceRef,
  startListening,
  faceV2CallbackRef,
  setIsCompleted,
  setIsLoading,
  setShowLoader,
  showLoader,
  modelUrl,
}) => {
  const texture = useTexture("/frontDesk.png");
  const viewport = useThree((state) => state.viewport);
  return (
    <>
      {/* <OrbitControls enableZoom={false} enableRotate={false} />
      <PerspectiveCamera makeDefault position={[0, 10, 450]} fov={30} />

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
      {/* <Environment preset="sunset" /> */}

      <OrbitControls enableZoom={false} enableRotate={false} />
      <PerspectiveCamera makeDefault position={[0, 0, 450]} fov={30} />
      <FullCharactor
        ref={faceRef}
        startListening={startListening}
        setIsLoading={setIsLoading}
        setIsCompleted={setIsCompleted}
        setShowLoader={setShowLoader}
        showLoader={showLoader}
        modelUrl={modelUrl}
      />
      {/* <FaceV3 ref={faceRef} startListening={startListening} /> */}
      <Environment preset="warehouse" />
      <mesh renderOrder={-1}>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial map={texture} depthWrite={false} depthTest={false} />
      </mesh>
    </>
  );
};

export default Experience;
