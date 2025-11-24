import { Environment, OrbitControls, useTexture } from "@react-three/drei";
import { Avatar } from "./Avatar";
import { useThree } from "@react-three/fiber";

export const Experience = ({
  script,
  setScriptStatus,
  startListening,
  scriptStatus,
}) => {
  // const texture = useTexture("/corporate.png");
  const texture = useTexture("/office.jpg");
  const viewport = useThree((state) => state.viewport);

  return (
    <>
      <OrbitControls
        enableZoom={false}
        enableRotate={false}
        enablePan={false}
      />
      <Avatar
        position={[0, -4.5, 5]}
        scale={3}
        script={script}
        scriptStatus={scriptStatus}
        setScriptStatus={setScriptStatus}
        startListening={startListening}
      />
      <Environment preset="sunset" />
      <mesh>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </>
  );
};
