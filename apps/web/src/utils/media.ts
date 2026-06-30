/**
 * Compresses an image file by resizing (if it exceeds maxWidth/maxHeight)
 * and compressing using canvas.toBlob.
 */
export const compressImage = (
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1600,
  maxHeight: number = 1600
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Preserve the original name but suffix it or keep it clean
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
};

/**
 * Generates a thumbnail for a video file by capturing a frame at 1 second.
 */
export const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.autoplay = false;
    video.muted = true;
    video.playsInline = true;
    
    // Set object URL as video source
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    video.onloadeddata = () => {
      // Seek to 1 second (or start if shorter)
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } else {
          resolve('');
        }
      } catch (e) {
        resolve('');
      } finally {
        URL.revokeObjectURL(videoUrl);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      resolve('');
    };
  });
};

/**
 * Parses a PDF file to extract the page count using a simple binary/text search.
 */
export const getPdfPageCount = (file: File): Promise<number | undefined> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = e.target?.result as ArrayBuffer;
      if (!arr) {
        resolve(undefined);
        return;
      }
      
      // Convert first 10MB of the file to text to search for page count metadata
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(new Uint8Array(arr.slice(0, 10 * 1024 * 1024)));
      
      // Search for '/Type /Pages' and look for '/Count'
      // E.g., /Type /Pages /Count 3
      const countMatch = text.match(/\/Count\s+(\d+)/);
      if (countMatch && countMatch[1]) {
        resolve(parseInt(countMatch[1], 10));
      } else {
        // Try searching for pages objects count
        const pagesMatches = text.match(/\/Type\s*\/Pages/g);
        if (pagesMatches) {
          resolve(pagesMatches.length);
        } else {
          resolve(undefined);
        }
      }
    };
    reader.onerror = () => {
      resolve(undefined);
    };
    reader.readAsArrayBuffer(file);
  });
};
