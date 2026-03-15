import { useState, useEffect } from 'react';

/**
 * Samples the bottom 40% of an image and returns whether the text
 * on top should be "white" (dark background) or "dark" (light background).
 */
export function useImageContrast(imageUrl: string | undefined): 'white' | 'dark' {
  const [contrast, setContrast] = useState<'white' | 'dark'>('white');
  useEffect(() => {
    if (!imageUrl) {
      setContrast('white');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const sampleH = Math.max(1, Math.round(img.naturalHeight * 0.4));
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(
        img,
        0,
        img.naturalHeight - sampleH,
        img.naturalWidth,
        sampleH,
        0,
        0,
        img.naturalWidth,
        sampleH
      );
      const { data } = ctx.getImageData(0, 0, canvas.width, sampleH);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      setContrast(sum / (data.length / 4) > 128 ? 'dark' : 'white');
    };
    img.src = imageUrl;
  }, [imageUrl]);
  return contrast;
}
