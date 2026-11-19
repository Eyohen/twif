import { useState } from 'react';
import { compressedImageDataUrl } from '../../utils/image';

export const MAX_CLARIFICATION_IMAGES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

// Optional pictures to go with a written clarification — a corrected photo of
// the payment, say, when the one on the invoice was the wrong one. The parent
// owns the list; each entry is { name, type, size, dataUrl }.
export default function ClarificationImagePicker({ images, onChange, label = 'Attach images (optional)' }) {
  const [problem, setProblem] = useState('');
  const [reading, setReading] = useState(false);

  const choose = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setProblem('');

    const room = MAX_CLARIFICATION_IMAGES - images.length;
    if (room <= 0) { setProblem(`You can attach up to ${MAX_CLARIFICATION_IMAGES} images.`); return; }
    const taken = files.slice(0, room);
    if (files.length > room) setProblem(`Only ${MAX_CLARIFICATION_IMAGES} images can be attached, so the extra ones were left out.`);

    setReading(true);
    const added = [];
    for (const file of taken) {
      if (!file.type.startsWith('image/')) { setProblem(`${file.name} is not an image.`); continue; }
      if (file.size > MAX_BYTES) { setProblem(`${file.name} is larger than 5 MB.`); continue; }
      try {
        const dataUrl = await compressedImageDataUrl(file, { maxEdge: 1800, quality: 0.85 });
        added.push({ name: file.name, type: file.type, size: file.size, dataUrl });
      } catch {
        setProblem(`${file.name} could not be read. Try another one.`);
      }
    }
    setReading(false);
    if (added.length) onChange([...images, ...added]);
  };

  return (
    <div className="clarification-images" style={{ marginTop: 10 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5a4e42', marginBottom: 6 }}>{label}</span>
      <input
        type="file"
        accept="image/*"
        multiple
        aria-label="Attach clarification images"
        onChange={choose}
        disabled={reading || images.length >= MAX_CLARIFICATION_IMAGES}
        style={{ fontSize: 12 }}
      />
      {reading ? <small style={{ display: 'block', marginTop: 4, color: '#8a7a6a' }}>Reading images…</small> : null}
      {problem ? <p role="alert" style={{ margin: '6px 0 0', fontSize: 12, color: '#8a3520' }}>{problem}</p> : null}
      {images.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {images.map((image, index) => (
            <div key={`${image.name}-${index}`} style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
              <img src={image.dataUrl} alt={`Clarification attachment ${index + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee5da' }} />
              <button type="button" onClick={() => onChange(images.filter((_, position) => position !== index))}
                style={{ padding: '2px 8px', border: '1px solid #f3d5cc', borderRadius: 6, background: '#fff5f0', color: '#8a3520', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
