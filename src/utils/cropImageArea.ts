// Helper untuk cropping area spesifik dari image base64 menggunakan HTMLCanvas
// Return: base64 hasil crop
// Helper untuk cropping area spesifik dari image base64 menggunakan HTMLCanvas
// crop: dalam rasio 0..1 (bukan pixel)
// Return: base64 hasil crop (sudah di-threshold black/white)
// Fungsi utama: cropping area spesifik dari image base64, output Blob
export async function cropImageAreaToBlob(base64: string, crop: {x: number, y: number, width: number, height: number}, options?: { scale?: number, adaptiveThreshold?: boolean }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const xPx = Math.round(img.width * crop.x);
      const yPx = Math.round(img.height * crop.y);
      const wPx = Math.round(img.width * crop.width);
      const hPx = Math.round(img.height * crop.height);
      const canvas = document.createElement('canvas');
            // Opsi resize
      const scale = options?.scale || 1;
      canvas.width = Math.round(wPx * scale);
      canvas.height = Math.round(hPx * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No 2D context');
            ctx.drawImage(img, xPx, yPx, wPx, hPx, 0, 0, canvas.width, canvas.height);
      // Adaptive threshold (sederhana, bukan OpenCV, tapi cukup untuk web)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      if (options?.adaptiveThreshold) {
        // Hitung rata-rata brightness seluruh area
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
        }
        const avg = sum / (data.length / 4);
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
          const bw = gray > avg ? 255 : 0;
          data[i] = data[i+1] = data[i+2] = bw;
        }
      } else {
        // Threshold biasa
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
          const bw = gray > 128 ? 255 : 0;
          data[i] = data[i+1] = data[i+2] = bw;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject('Failed to convert canvas to Blob');
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = base64;
  });
}

// Helper opsional: output base64, wrap dari Blob
export async function cropImageAreaToBase64(base64: string, crop: {x: number, y: number, width: number, height: number}): Promise<string> {
  const blob = await cropImageAreaToBlob(base64, crop);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject('Failed to convert Blob to base64');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


