import React, { useState, useRef, forwardRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import './App.css';
import { OrbitControls, Stats, useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

// Custom hook to load GLTF with Draco compression
const useDracoGLTF = (url) => {
  const { scene } = useGLTF(url, true, (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader);
  });
  return { scene };
};

// Component to load the GLB file with Draco compression
const Model = forwardRef(({ url }, ref) => {
  const { scene } = useDracoGLTF(url);
  return <primitive object={scene} ref={ref} />;
});

function InfoPanel({ object }) {
  if (!object) return null;

  const { geometry, material } = object;

  return (
    <div className="info-panel">
      <h2>Object Info</h2>
      <p><strong>Name:</strong> {object.name}</p>
      <p><strong>Geometry:</strong> {geometry.type}</p>
      <p><strong>Material:</strong> {material ? material.type : 'None'}</p>
    </div>
  );
}

export default function App() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [highlightedMesh, setHighlightedMesh] = useState(null);
  const modelRef = useRef();

  const handleObjectClick = (mesh) => {
    setSelectedObject(mesh);
  };

  const handleObjectHover = (mesh) => {
    if (mesh) {
      if (mesh !== highlightedMesh) {
        if (highlightedMesh) {
          highlightedMesh.material.color.copy(highlightedMesh.originalColor);
        }

        mesh.originalColor = mesh.material.color.clone();
        const darkerColor = mesh.originalColor.clone().multiplyScalar(0.8);
        mesh.material.color = darkerColor;

        setHighlightedMesh(mesh);
      }
    } else {
      if (highlightedMesh) {
        highlightedMesh.material.color.copy(highlightedMesh.originalColor);
      }
      setHighlightedMesh(null);
    }
  };

  const handleExport = () => {
    if (modelRef.current) {
      const exporter = new GLTFExporter();
      exporter.parse(
        modelRef.current,
        (result) => {
          const output = JSON.stringify(result, null, 2);
          const blob = new Blob([output], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'compressed-model.glb';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        },
        {
          binary: true,
          dracoOptions: {
            decodeSpeed: 5,
            encodeSpeed: 5,
            encoderOptions: {
              method: 'edgebreaker',
              quantization: [10, 10, 10, 10, 10],
            },
          },
        }
      );
    }
  };

  return (
    <>
      <Canvas camera={{ position: [-8, 3, 8] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 0, 5]} />
        <Model url="/sample/olympia.glb" ref={modelRef} />
        <OrbitControls />
        <Stats />
      </Canvas>
      <InfoPanel object={highlightedMesh || selectedObject} />
      <button onClick={handleExport}>Export Model</button>
    </>
  );
}
