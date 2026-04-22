import { useRef, useCallback } from 'react';
import type * as Hands from '@mediapipe/hands';

interface HandGesturesProps {
  onRotationChange: (delta: { x: number; y: number }) => void;
  onPanChange: (delta: { x: number; y: number }) => void;
  onZoomChange: (updater: (prev: number) => number) => void;
  onLayoutToggle: (mode: 'sphere' | 'grid') => void;
  onGestureLabel: (label: string) => void;
  layoutMode: 'sphere' | 'grid';
}

export function useHandGestures({ onRotationChange, onPanChange, onZoomChange, onLayoutToggle, onGestureLabel, layoutMode }: HandGesturesProps) {
  const prevWristRef = useRef<{ x: number; y: number } | null>(null);
  const prevDistanceRef = useRef<number | null>(null);
  const smoothedVelocityRef = useRef({ x: 0, y: 0 });
  const fistFrameCountRef = useRef(0);
  const flattenFrameCountRef = useRef(0);
  const sphereFrameCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const lastLayoutToggleTimeRef = useRef(0);

  const processLandmarks = useCallback((landmarksArray: Hands.NormalizedLandmarkList[] | null) => {
    const now = performance.now();
    
    if (!landmarksArray || landmarksArray.length === 0) {
      prevWristRef.current = null;
      prevDistanceRef.current = null;
      flattenFrameCountRef.current = 0;
      sphereFrameCountRef.current = 0;
      return;
    }

    if (now - lastUpdateTimeRef.current > 500) {
      prevWristRef.current = null;
      prevDistanceRef.current = null;
    }
    lastUpdateTimeRef.current = now;

    // --- TWO HAND GESTURES (Layout Toggling) ---
    if (landmarksArray.length >= 2) {
      const hand1 = landmarksArray[0];
      const hand2 = landmarksArray[1];
      
      const isHand1Open = [8, 12, 16, 20].every(tip => hand1[tip].y < hand1[tip - 3].y);
      const isHand2Open = [8, 12, 16, 20].every(tip => hand2[tip].y < hand2[tip - 3].y);
      
      const isFist = (hand: Hands.NormalizedLandmarkList) => {
        return hand[8].y > hand[5].y &&
               hand[12].y > hand[9].y &&
               hand[16].y > hand[13].y &&
               hand[20].y > hand[17].y;
      };
      const isHand1Fist = isFist(hand1);
      const isHand2Fist = isFist(hand2);

      const wristDistance = Math.sqrt(
        Math.pow(hand1[0].x - hand2[0].x, 2) +
        Math.pow(hand1[0].y - hand2[0].y, 2) +
        Math.pow(hand1[0].z - hand2[0].z, 2)
      );

      // Require user to hold the gesture for 15 frames (~0.5s) to avoid accidental triggers
      if (isHand1Open && isHand2Open && wristDistance > 0.4 && layoutMode === 'sphere') {
        flattenFrameCountRef.current++;
        sphereFrameCountRef.current = 0;
        
        if (flattenFrameCountRef.current > 15) {
          if (now - lastLayoutToggleTimeRef.current > 2000) {
            onLayoutToggle('grid');
            onGestureLabel("👐 Flattening Sphere");
            lastLayoutToggleTimeRef.current = now;
          }
          flattenFrameCountRef.current = 0;
        } else {
          onGestureLabel("⏳ Hold to Flatten...");
        }
      } else if (isHand1Fist && isHand2Fist && layoutMode === 'grid') {
        sphereFrameCountRef.current++;
        flattenFrameCountRef.current = 0;
        
        if (sphereFrameCountRef.current > 15) {
          if (now - lastLayoutToggleTimeRef.current > 2000) {
            onLayoutToggle('sphere');
            onGestureLabel("✊✊ Crumpling to Sphere");
            lastLayoutToggleTimeRef.current = now;
          }
          sphereFrameCountRef.current = 0;
        } else {
          onGestureLabel("⏳ Hold to Crumple...");
        }
      } else {
        flattenFrameCountRef.current = 0;
        sphereFrameCountRef.current = 0;
      }

      // If tracking two hands, don't process single hand
      prevWristRef.current = null;
      prevDistanceRef.current = null;
      return; 
    }

    // --- SINGLE HAND GESTURES ---
    flattenFrameCountRef.current = 0;
    sphereFrameCountRef.current = 0;
    
    const primaryHand = landmarksArray[0];
    const wrist = primaryHand[0];
    const thumbTip = primaryHand[4];
    const indexTip = primaryHand[8];
    const middleTip = primaryHand[12];
    const ringTip = primaryHand[16];
    const pinkyTip = primaryHand[20];
    
    const indexMcp = primaryHand[5];
    const middleMcp = primaryHand[9];
    const ringMcp = primaryHand[13];
    const pinkyMcp = primaryHand[17];

    // CONTINUOUS JOYSTICK-STYLE TRACKING (Rotate or Pan)
    let targetVx = (wrist.x - 0.5) * 2.0; 
    let targetVy = (wrist.y - 0.5) * 2.0; 
    
    const deadzone = 0.3;
    if (Math.abs(targetVx) < deadzone) targetVx = 0;
    else targetVx = targetVx > 0 ? targetVx - deadzone : targetVx + deadzone;
    
    if (Math.abs(targetVy) < deadzone) targetVy = 0;
    else targetVy = targetVy > 0 ? targetVy - deadzone : targetVy + deadzone;

    // Apply momentum/smoothing to the raw velocity. 
    // This completely eliminates micro-jitter from hand tracking and makes movement feel heavy and premium.
    smoothedVelocityRef.current.x = smoothedVelocityRef.current.x * 0.85 + targetVx * 0.15;
    smoothedVelocityRef.current.y = smoothedVelocityRef.current.y * 0.85 + targetVy * 0.15;

    const vx = smoothedVelocityRef.current.x;
    const vy = smoothedVelocityRef.current.y;

    if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) {
      if (layoutMode === 'sphere') {
        onRotationChange({ x: vx * 0.04, y: vy * 0.04 });
        if (Math.abs(targetVx) > 0 || Math.abs(targetVy) > 0) {
           onGestureLabel("🔄 Spinning");
        }
      } else {
        onPanChange({ x: vx * 0.05, y: vy * 0.05 });
        if (Math.abs(targetVx) > 0 || Math.abs(targetVy) > 0) {
           onGestureLabel("✋ Panning Grid");
        }
      }
    }

    // PINCH ZOOM
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );

    if (prevDistanceRef.current !== null) {
      const pinchDelta = distance - prevDistanceRef.current;
      
      if (Math.abs(pinchDelta) > 0.005) {
        onZoomChange((prev) => {
          // Adjust zoom limits based on layout mode
          const maxZoom = layoutMode === 'grid' ? 50 : 15;
          const newZoom = prev - pinchDelta * 20;
          return Math.max(1.5, Math.min(maxZoom, newZoom));
        });
        
        if (pinchDelta > 0) onGestureLabel("🔍 Zoom In");
        else onGestureLabel("🔎 Zoom Out");
        
        prevDistanceRef.current = distance;
      }
    } else {
      prevDistanceRef.current = distance;
    }

    // CLOSED FIST RESET
    const isFist = 
      indexTip.y > indexMcp.y &&
      middleTip.y > middleMcp.y &&
      ringTip.y > ringMcp.y &&
      pinkyTip.y > pinkyMcp.y;

    if (isFist) {
      fistFrameCountRef.current += 1;
      if (fistFrameCountRef.current >= 10) {
        // Reset zoom and pan
        onZoomChange(() => layoutMode === 'grid' ? 8.5 : 7); 
        if (layoutMode === 'grid') onPanChange({ x: -1000, y: -1000 }); // Special flag for reset
        onGestureLabel("✊ Reset View");
        fistFrameCountRef.current = 0;
      }
    } else {
      fistFrameCountRef.current = 0;
    }
  }, [onRotationChange, onPanChange, onZoomChange, onLayoutToggle, onGestureLabel, layoutMode]);

  return { processLandmarks };
}
