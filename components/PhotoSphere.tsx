'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { fibonacciSphere } from '../utils/fibonacci';

interface PhotoSphereProps {
  photos: string[];
  targetRotation: { x: number; y: number };
  targetPan: { x: number; y: number };
  zoomLevel: number;
  layoutMode: 'sphere' | 'grid';
}

const PASTEL_COLORS = ['#FFE4E1', '#E1F5FE', '#F3E5F5', '#E8F5E9', '#FFF9C4'];
const SPHERE_RADIUS = 2.2;
const PHOTO_COUNT = 150; // Denser sphere

function CameraController({ zoomLevel }: { zoomLevel: number }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, zoomLevel, 0.05); // Smooth zoom
  });
  return null;
}

function AnimatedCard({ isPlaceholder, url, color, spherePos, sphereRot, gridPos, gridRot, layoutMode, delay }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const [activeMode, setActiveMode] = useState(layoutMode);

  // Conditionally load texture if not placeholder
  const texture = !isPlaceholder ? useTexture(url) : null;
  const { gl } = useThree();

  // PRE-CALCULATE targets ONCE to completely eliminate Garbage Collection stutter
  // Recreating Vector3/Quaternion in useFrame 150 times per frame causes severe stuttering.
  const spherePosVec = useMemo(() => new THREE.Vector3(...spherePos), [spherePos]);
  const sphereQuat = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(...sphereRot)), [sphereRot]);
  const gridPosVec = useMemo(() => new THREE.Vector3(...gridPos), [gridPos]);
  const gridQuat = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(...gridRot)), [gridRot]);

  useEffect(() => {
    // Enable max anisotropy for incredibly crisp images at steep spherical angles
    if (texture && gl) {
      const tex = texture as THREE.Texture;
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
      tex.minFilter = THREE.LinearMipMapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    }
  }, [texture, gl]);

  useEffect(() => {
    // "Crumpled Paper" delay effect
    const timeout = setTimeout(() => {
      setActiveMode(layoutMode);
    }, delay);
    return () => clearTimeout(timeout);
  }, [layoutMode, delay]);

  useFrame(() => {
    if (groupRef.current) {
      const targetP = activeMode === 'sphere' ? spherePosVec : gridPosVec;
      const targetQ = activeMode === 'sphere' ? sphereQuat : gridQuat;

      groupRef.current.position.lerp(targetP, 0.06);
      groupRef.current.quaternion.slerp(targetQ, 0.06);
    }
  });

  return (
    <group ref={groupRef} position={spherePos} rotation={sphereRot}>
      {/* Center White Border */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.42, 0.57]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>

      {/* Front Photo */}
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[0.4, 0.55]} />
        {isPlaceholder ? (
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0} />
        ) : (
          <meshStandardMaterial map={texture as THREE.Texture} roughness={0.3} metalness={0} />
        )}
      </mesh>

      {/* Back Photo (Rotated so it's not mirrored) */}
      <mesh position={[0, 0, -0.015]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.4, 0.55]} />
        {isPlaceholder ? (
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0} />
        ) : (
          <meshStandardMaterial map={texture as THREE.Texture} roughness={0.3} metalness={0} />
        )}
      </mesh>
    </group>
  );
}

function SceneContent({ photos, targetRotation, targetPan, layoutMode }: Omit<PhotoSphereProps, 'zoomLevel'>) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      if (layoutMode === 'sphere') {
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.x, 0.1);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.y, 0.1);
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, 0.1);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, 0.1);
      } else {
        // Un-rotate the group to face camera cleanly
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.05);
        // Pan the group based on hand movement
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPan.x, 0.1);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPan.y, 0.1);
      }
    }
  });

  const items = useMemo(() => {
    const points = fibonacciSphere(PHOTO_COUNT, SPHERE_RADIUS);

    // Grid settings
    const GRID_COLS = 15;
    const SPACING_X = 0.45;
    const SPACING_Y = 0.6;
    const width = (GRID_COLS - 1) * SPACING_X;
    const height = (Math.ceil(PHOTO_COUNT / GRID_COLS) - 1) * SPACING_Y;

    return points.map((pos, i) => {
      // --- SPHERE TARGET ---
      const spherePosition = new THREE.Vector3(pos.x, pos.y, pos.z);
      const target = new THREE.Vector3(0, 0, 0);
      const dummy = new THREE.Object3D();
      dummy.position.copy(spherePosition);
      dummy.lookAt(target);
      dummy.rotateY(Math.PI); // Face outwards
      const randomZ = THREE.MathUtils.degToRad((Math.random() - 0.5) * 30);
      dummy.rotateZ(randomZ);
      const sphereRotation = [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z];

      // --- GRID TARGET ---
      const gridX = (i % GRID_COLS) * SPACING_X - width / 2;
      const gridY = -Math.floor(i / GRID_COLS) * SPACING_Y + height / 2;
      const gridZ = (Math.random() - 0.5) * 0.2; // Slight crumpled depth
      const gridPosition = [gridX, gridY, gridZ];

      // Slight random rotation for crumpled paper look
      const gridRotZ = THREE.MathUtils.degToRad((Math.random() - 0.5) * 10);
      const gridRotY = THREE.MathUtils.degToRad((Math.random() - 0.5) * 15);
      const gridRotX = THREE.MathUtils.degToRad((Math.random() - 0.5) * 15);
      const gridRotation = [gridRotX, gridRotY, gridRotZ];

      const actualUrl = photos.length > 0 ? photos[i % photos.length] : null;

      // Random delay between 0 and 800ms for staggered animation
      const delay = Math.random() * 800;

      return {
        id: i,
        spherePos: [spherePosition.x, spherePosition.y, spherePosition.z],
        sphereRot: sphereRotation,
        gridPos: gridPosition,
        gridRot: gridRotation,
        url: actualUrl,
        color: actualUrl ? null : PASTEL_COLORS[i % PASTEL_COLORS.length],
        isPlaceholder: !actualUrl,
        delay
      };
    });
  }, [photos]);

  return (
    <group ref={groupRef}>
      {items.map((item) => (
        <AnimatedCard
          key={`card-${item.id}-${item.url || 'placeholder'}`}
          {...item}
          layoutMode={layoutMode}
        />
      ))}
    </group>
  );
}

export function PhotoSphere({ photos, targetRotation, targetPan, zoomLevel, layoutMode }: PhotoSphereProps) {
  return (
    <div className="w-full h-full bg-black absolute inset-0 z-10">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />

        <CameraController zoomLevel={zoomLevel} />

        <React.Suspense fallback={null}>
          <SceneContent
            photos={photos}
            targetRotation={targetRotation}
            targetPan={targetPan}
            layoutMode={layoutMode}
          />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
