import { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

// A picture shown full size over the page, with zoom so a fabric's weave and
// colour can be inspected. Closes on Esc, the Close button or a click outside.
const STEPS = [1, 1.5, 2, 3, 4];

export default function ImageLightbox({ src, label = 'Image', onClose }) {
  const [step, setStep] = useState(0);
  const zoom = STEPS[step];

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const control = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' };

  return (
    <div role="dialog" aria-label={label} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,17,0.8)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ maxWidth: '92vw', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ maxWidth: '92vw', maxHeight: '78vh', overflow: 'auto', borderRadius: 8, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', background: '#000' }}>
          <img
            src={src}
            alt={label}
            style={zoom === 1
              ? { display: 'block', maxWidth: '92vw', maxHeight: '78vh' }
              : { display: 'block', width: `${zoom * 100}%`, maxWidth: 'none', minWidth: `${zoom * 60}vw` }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
          <button type="button" aria-label="Zoom out" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} style={{ ...control, opacity: step === 0 ? 0.4 : 1 }}><ZoomOut size={14} /></button>
          <span style={{ fontSize: 12, minWidth: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" disabled={step === STEPS.length - 1} onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))} style={{ ...control, opacity: step === STEPS.length - 1 ? 0.4 : 1 }}><ZoomIn size={14} /></button>
          <button type="button" onClick={onClose} style={control}><X size={14} /> Close</button>
        </div>
      </div>
    </div>
  );
}
