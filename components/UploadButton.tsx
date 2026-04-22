'use client';

import React, { useRef, useState } from 'react';

interface UploadButtonProps {
  onPhotosUploaded: (urls: string[]) => void;
}

export function UploadButton({ onPhotosUploaded }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Max dimension 1024px to prevent WebGL VRAM crash/glitching
        const MAX_DIM = 1024; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height *= MAX_DIM / width));
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width *= MAX_DIM / height));
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill white background in case of transparent PNGs to prevent black artifacts
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          
          // Better scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        URL.revokeObjectURL(objectUrl);
        // Output as high-quality compressed JPEG
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(objectUrl); // Fallback
      };
      
      img.src = objectUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 50) {
      alert("Warning: Adding a massive amount of photos might cause stuttering during upload.");
    }

    setIsProcessing(true);
    setToastMessage(`Optimizing ${files.length} images...`);

    try {
      const newUrls: string[] = [];
      // Process sequentially to avoid completely locking the main thread and crashing the browser
      for (let i = 0; i < files.length; i++) {
        const optimizedDataUrl = await resizeImage(files[i]);
        newUrls.push(optimizedDataUrl);
      }

      onPhotosUploaded(newUrls);
      setToastMessage(`${files.length} photos added perfectly!`);
    } catch (err) {
      setToastMessage(`Error processing some photos.`);
    }

    setTimeout(() => setToastMessage(null), 3000);
    setIsProcessing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="fixed top-6 left-6 z-50 flex flex-col gap-2">
        <button
          onClick={handleButtonClick}
          disabled={isProcessing}
          className={`${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-800 hover:bg-white transition-colors border border-gray-100 flex items-center gap-2`}
        >
          <span className="text-lg">{isProcessing ? '⏳' : '↑'}</span> 
          {isProcessing ? 'Processing...' : 'Upload Images'}
        </button>
        {toastMessage && (
          <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm shadow-lg animate-in fade-in">
            {toastMessage}
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
      />
    </>
  );
}
