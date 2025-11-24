import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense } from "react";

function Avatar() {
  // Load your GLB/GLTF model (place it inside public/ folder)
  const { scene } = useGLTF("/meta_human.glb");
  return <primitive object={scene} scale={1.2} position={[0, -1.4, 0]} />;
}

export default function ThreeModel() {
  return (
    <div className="w-full h-screen bg-linear-to-br from-gray-900 to-black  overflow-hidden">
      <Canvas camera={{ position: [0, 1.5, 3], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 5, 5]} intensity={1.5} />
        <Suspense fallback={null}>
          <Avatar />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enableRotate={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
