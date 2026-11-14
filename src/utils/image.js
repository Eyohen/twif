// Phone photos run to 3–5 MB, and the order sheet carries its style pictures
// inside the request itself as base64, which is a third bigger again. A few of
// them went past the server's request limit and the save failed with "request
// entity too large" — mostly on phones, whose cameras take the biggest pictures.
//
// Pictures are shrunk in the browser before they are attached: the long edge is
// capped and the result re-encoded as JPEG, which keeps a photo or a receipt
// screenshot perfectly legible at a fraction of the size. A file that is
// already small, or that cannot be re-encoded here, is passed through as it is.
const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Could not read that file.'));
  reader.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not open that image.'));
  image.src = src;
});

export async function compressedImageDataUrl(file, { maxEdge = 1600, quality = 0.82, skipBelowBytes = 300 * 1024 } = {}) {
  const original = await readAsDataUrl(file);
  // GIFs and SVGs would lose what makes them what they are; small files are
  // not worth the re-encode.
  if (file.size <= skipBelowBytes || /gif|svg/i.test(file.type)) return original;
  try {
    const image = await loadImage(original);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return original;
    // A transparent PNG becomes white rather than black under JPEG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const compressed = canvas.toDataURL('image/jpeg', quality);
    return compressed.length < original.length ? compressed : original;
  } catch {
    return original;
  }
}
