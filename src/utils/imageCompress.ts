/**
 * Compresses an image data URL into a lightweight JPEG thumbnail (<= 300 KB)
 * so Firestore documents remain safely below the 1 MB limit while preserving
 * a readable visual reference across devices.
 */
export async function buildCloudPreviewDataUrl(
  dataUrl: string,
  mimeType: string
): Promise<string> {
  if (!dataUrl) return '';
  // PDFs cannot be rasterized directly via <img>; only keep small PDFs or strip large ones
  if (mimeType === 'application/pdf') {
    return dataUrl.length <= 320_000 ? dataUrl : '';
  }

  if (dataUrl.length <= 280_000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 1000;
        let width = img.naturalWidth || 800;
        let height = img.naturalHeight || 1100;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let compressed = canvas.toDataURL('image/jpeg', 0.6);
        if (compressed.length > 320_000) {
          compressed = canvas.toDataURL('image/jpeg', 0.4);
        }
        resolve(compressed.length <= 340_000 ? compressed : '');
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}
