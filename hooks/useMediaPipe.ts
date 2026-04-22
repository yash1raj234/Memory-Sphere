import { useEffect, useRef, useState } from 'react';
import type { Hands, Results } from '@mediapipe/hands';
import type { Camera } from '@mediapipe/camera_utils';

let isInstantiating = false;

export function useMediaPipe(onResults: (results: Results) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let camera: Camera | null = null;
    let hands: Hands | null = null;
    let isMounted = true;
    let localIsInstantiating = false;

    const init = async () => {
      if (isInstantiating) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!isMounted) return;
      }
      
      localIsInstantiating = true;
      isInstantiating = true;

      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        if (!isMounted) return;
        setHasCameraPermission(true);
      } catch (err) {
        if (!isMounted) return;
        setHasCameraPermission(false);
        isInstantiating = false;
        return;
      }

      const mpHands = await import('@mediapipe/hands');
      const mpCamera = await import('@mediapipe/camera_utils');
      
      if (!isMounted) {
        isInstantiating = false;
        return;
      }

      const HandsCtor = mpHands.Hands || (window as any).Hands;
      const CameraCtor = mpCamera.Camera || (window as any).Camera;

      if (!HandsCtor || !CameraCtor) {
        console.error("MediaPipe failed to load");
        isInstantiating = false;
        return;
      }

      try {
        hands = new HandsCtor({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands!.setOptions({
          maxNumHands: 2,
          modelComplexity: 0, // 0 = Lite model. Massive performance boost!
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands!.onResults(onResults);
      } catch (e) {
        console.error("Failed to init hands", e);
      }

      if (!isMounted) {
        if (hands) hands.close();
        isInstantiating = false;
        return;
      }

      setIsLoaded(true);

      if (videoRef.current && hands) {
        camera = new CameraCtor(videoRef.current, {
          onFrame: async () => {
            if (!isMounted || !hands || !videoRef.current) return;
            try {
              await hands!.send({ image: videoRef.current });
            } catch (e) {
              // Ignore errors if hands is closed or deleted
            }
          },
          width: 640,
          height: 480
        });
        camera!.start();
      }
      isInstantiating = false;
    };

    init();

    return () => {
      isMounted = false;
      if (camera) {
        camera.stop();
        camera = null;
      }
      if (hands) {
        hands.close();
        hands = null;
      }
      if (localIsInstantiating) {
        isInstantiating = false;
      }
    };
  }, [onResults]);

  return { videoRef, isLoaded, hasCameraPermission };
}
