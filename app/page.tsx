'use client';

import React, { useState, useCallback } from 'react';
import { PhotoSphere } from '../components/PhotoSphere';
import { HandTracker } from '../components/HandTracker';
import { UploadButton } from '../components/UploadButton';

export default function Home() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0 });
  const [targetPan, setTargetPan] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(7);
  const [layoutMode, setLayoutMode] = useState<'sphere' | 'grid'>('sphere');

  const handlePhotosUploaded = useCallback((newPhotos: string[]) => {
    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const handleRotationChange = useCallback((delta: { x: number; y: number }) => {
    setTargetRotation(prev => {
      return {
        x: 0, // Lock X to keep sphere level
        y: prev.y + delta.x * 1
      };
    });
  }, []);

  const handlePanChange = useCallback((delta: { x: number; y: number }) => {
    if (delta.x === -1000 && delta.y === -1000) {
      setTargetPan({ x: 0, y: 0 }); // Reset flag
      return;
    }
    setTargetPan(prev => {
      // Much tighter clamp to keep the camera strictly within the 6.5x5.5 grid
      const newX = Math.max(-3.5, Math.min(3.5, prev.x + delta.x * 1));
      const newY = Math.max(-3.0, Math.min(3.0, prev.y + delta.y * 1));
      return { x: newX, y: newY };
    });
  }, []);

  const handleZoomChange = useCallback((updater: (prev: number) => number) => {
    setZoomLevel(updater);
  }, []);

  const handleLayoutToggle = useCallback((mode: 'sphere' | 'grid') => {
    setLayoutMode(mode);
    if (mode === 'grid') {
      setZoomLevel(8.5); // Perfectly frames the 15x10 grid on most screens
      setTargetRotation({ x: 0, y: 0 }); // Center rotation
      setTargetPan({ x: 0, y: 0 }); // Center pan
    } else {
      setZoomLevel(7);  // Default sphere zoom
      setTargetPan({ x: 0, y: 0 });
    }
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-black">
      <PhotoSphere 
        photos={photos} 
        targetRotation={targetRotation} 
        targetPan={targetPan}
        zoomLevel={zoomLevel} 
        layoutMode={layoutMode}
      />
      
      <UploadButton onPhotosUploaded={handlePhotosUploaded} />
      
      <HandTracker 
        onRotationChange={handleRotationChange}
        onPanChange={handlePanChange}
        onZoomChange={handleZoomChange}
        onLayoutToggle={handleLayoutToggle}
        layoutMode={layoutMode}
      />
    </main>
  );
}
