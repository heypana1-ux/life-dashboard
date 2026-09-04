/*
  Client-side image downscaling (no upload).

  `resizeImageToBlob` is the one to use for anything the user can add many of — it hands back
  raw bytes for IndexedDB, which is a third smaller than the same image base64-encoded. The
  data-URL variant remains for the single small avatar, where being part of the synced JSON is
  worth more than the bytes.
*/

/** Downscale to a compressed JPEG Blob — for images stored in IndexedDB. */
export function resizeImageToBlob(file: File, maxDim = 1000, quality = 0.7): Promise<Blob> {
  return drawScaled(file, maxDim).then(
    (canvas) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality),
      ),
  );
}

/** Downscale to a compressed JPEG data URL — for the avatar, which rides along in the JSON. */
export function resizeImageToDataUrl(file: File, maxDim = 1000, quality = 0.7): Promise<string> {
  return drawScaled(file, maxDim).then((canvas) => canvas.toDataURL("image/jpeg", quality));
}

/** Reads the file, scales it to fit `maxDim` on its longest side, returns the canvas. */
function drawScaled(file: File, maxDim: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas context"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
