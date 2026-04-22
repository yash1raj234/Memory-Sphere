'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useHandGestures } from '../hooks/useHandGestures';
import type { Results } from '@mediapipe/hands';

interface HandTrackerProps {
  onRotationChange: (velocity: { x: number; y: number }) => void;
  onPanChange: (delta: { x: number; y: number }) => void;
  onZoomChange: (updater: (prev: number) => number) => void;
  onLayoutToggle: (mode: 'sphere' | 'grid') => void;
  layoutMode: 'sphere' | 'grid';
}

export function HandTracker({ onRotationChange, onPanChange, onZoomChange, onLayoutToggle, layoutMode }: HandTrackerProps) {
  const [gestureLabel, setGestureLabel] = useState<string | null>(null);
  const [isHandVisible, setIsHandVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const hideGestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleGestureLabel = useCallback((label: string) => {
    setGestureLabel(label);
    if (hideGestureTimeoutRef.current) {
      clearTimeout(hideGestureTimeoutRef.current);
    }
    hideGestureTimeoutRef.current = setTimeout(() => {
      setGestureLabel(null);
    }, 1500);
  }, []);

  const { processLandmarks } = useHandGestures({
    onRotationChange,
    onPanChange,
    onZoomChange,
    onLayoutToggle,
    onGestureLabel: handleGestureLabel,
    layoutMode
  });

  const onResults = useCallback((results: Results) => {
    // Draw landmarks
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (results.multiHandLandmarks) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'white';
          ctx.fillStyle = '#00d1ff'; // Cyan joint dots

          const CONNECTIONS = [
            [0,1],[1,2],[2,3],[3,4], // Thumb
            [0,5],[5,6],[6,7],[7,8], // Index
            [5,9],[9,10],[10,11],[11,12], // Middle
            [9,13],[13,14],[14,15],[15,16], // Ring
            [13,17],[17,18],[18,19],[19,20], // Pinky
            [0,17] // Palm base
          ];

          for (const landmarks of results.multiHandLandmarks) {
            ctx.beginPath();
            for (const [start, end] of CONNECTIONS) {
              ctx.moveTo(landmarks[start].x * canvasRef.current.width, landmarks[start].y * canvasRef.current.height);
              ctx.lineTo(landmarks[end].x * canvasRef.current.width, landmarks[end].y * canvasRef.current.height);
            }
            ctx.stroke();

            for (const landmark of landmarks) {
              ctx.beginPath();
              ctx.arc(landmark.x * canvasRef.current.width, landmark.y * canvasRef.current.height, 4, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        }
      }
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setIsHandVisible(true);
      processLandmarks(results.multiHandLandmarks); 
    } else {
      setIsHandVisible(false);
      processLandmarks(null);
    }
  }, [processLandmarks]);

  const { videoRef, hasCameraPermission } = useMediaPipe(onResults);

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
        <div className="text-xs font-medium text-gray-500 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-2 border border-gray-100">
          <div className={`w-2 h-2 rounded-full ${isHandVisible ? 'bg-green-500' : 'bg-gray-300'}`} />
          {hasCameraPermission === false ? "Camera permission denied" : "Hand tracking active 👋"}
        </div>
        {hasCameraPermission !== false && (
          <div className="w-[200px] h-[150px] rounded-xl overflow-hidden shadow-lg border-2 border-black/10 bg-black/5 relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover transform -scale-x-100 absolute inset-0"
              playsInline
              muted
              autoPlay
            />
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover transform -scale-x-100 absolute inset-0 z-10 pointer-events-none"
              width={640}
              height={480}
            />
          </div>
        )}
      </div>

      {gestureLabel && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl border border-gray-100 text-lg font-medium text-gray-800 shadow-xl border border-gray-100">
            {gestureLabel}
          </div>
        </div>
      )}

      <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white transition-colors font-medium"
        >
          ?
        </button>
        {showGuide && (
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-gray-100 text-sm text-gray-600 min-w-[250px] animate-in slide-in-from-top-4 fade-in">
            <h3 className="font-semibold text-gray-900 mb-3 text-base">Gestures</h3>
            <ul className="space-y-3">
              <li className="flex justify-between items-center gap-4"><span>Move Hand</span> <span className="font-medium text-gray-900">🔄 Spin / ✋ Pan</span></li>
              <li className="flex justify-between items-center gap-4"><span>Pinch apart / together</span> <span className="font-medium text-gray-900">🔍 Zoom in/out</span></li>
              <li className="flex justify-between items-center gap-4"><span>Two Open Palms 👐</span> <span className="font-medium text-gray-900">Flat Grid</span></li>
              <li className="flex justify-between items-center gap-4"><span>Two Fists ✊✊</span> <span className="font-medium text-gray-900">Form Sphere</span></li>
              <li className="flex justify-between items-center gap-4"><span>Single Fist</span> <span className="font-medium text-gray-900">✊ Reset</span></li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
