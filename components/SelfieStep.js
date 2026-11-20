'use client';
import { useRef, useState } from 'react';
import { p } from '../lib/i18n';

// Provider selfie verification (demo implementation).
//
// The provider takes/uploads a photo; we run REAL face detection in the
// browser with @tensorflow-models/blazeface (loaded with a dynamic import
// ONLY when this step mounts, so no other screen pays the tfjs bundle cost).
//   - No face found  -> the step REJECTS the photo and account creation stays
//                       blocked. There is no skip and no silent pass.
//   - Face found     -> the image is cropped to a square around the face
//                       (~30% padding) on a canvas, so the saved profile photo
//                       shows ONLY the face — no background. This is deliberate:
//                       a background can contain a displayed phone number, and
//                       the crop removes that leak risk.
//   - Model load fail -> clear error + retry; the step does NOT pass.
// The crop is saved as a small data URL (256x256 JPEG) on providers[id].photo.
//
// NOTE (production): on-device detection is a demo gate only. Production must
// re-verify server-side (face match + liveness) before trusting the photo.
let modelPromise = null;
function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const blazeface = await import('@tensorflow-models/blazeface');
      return blazeface.load();
    })();
    // If loading fails, clear the cache so Retry can try again.
    modelPromise.catch(() => { modelPromise = null; });
  }
  return modelPromise;
}

const MAX_DIM = 1024; // downscale big phone photos before detection
const OUT_SIZE = 256; // saved crop size

export default function SelfieStep({ lang, onDone, onBack, title }) {
  const camRef = useRef(null);
  const upRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | working | noface | error | done
  const [crop, setCrop] = useState(null);
  const [busyLabel, setBusyLabel] = useState('');

  const processFile = async (file) => {
    if (!file) return;
    setCrop(null);
    setState('working');
    setBusyLabel(lang === 'en' ? 'Loading face check…' : 'Chehra check ho raha hai…');
    try {
      const model = await loadModel();
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = url;
        });
        // Draw (downscaled) to a working canvas; detection coords live in this space.
        const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
        const W = Math.max(1, Math.round(img.naturalWidth * scale));
        const H = Math.max(1, Math.round(img.naturalHeight * scale));
        const src = document.createElement('canvas');
        src.width = W; src.height = H;
        src.getContext('2d').drawImage(img, 0, 0, W, H);

        setBusyLabel(lang === 'en' ? 'Looking for a face…' : 'Chehra dhoond rahe hain…');
        const faces = await model.estimateFaces(src, false);
        if (!faces || faces.length === 0) { setState('noface'); return; }
        // Largest face wins if several people are in frame.
        const face = faces.reduce((a, b) => {
          const area = (f) => (f.bottomRight[0] - f.topLeft[0]) * (f.bottomRight[1] - f.topLeft[1]);
          return area(b) > area(a) ? b : a;
        });
        // Square crop around the face centre with ~30% padding on every side,
        // clamped inside the image so no background sneaks back in at edges.
        const fw = face.bottomRight[0] - face.topLeft[0];
        const fh = face.bottomRight[1] - face.topLeft[1];
        let side = Math.max(fw, fh) * 1.6;
        side = Math.min(side, W, H);
        const cx = face.topLeft[0] + fw / 2;
        const cy = face.topLeft[1] + fh / 2;
        const sx = Math.max(0, Math.min(cx - side / 2, W - side));
        const sy = Math.max(0, Math.min(cy - side / 2, H - side));
        const out = document.createElement('canvas');
        out.width = OUT_SIZE; out.height = OUT_SIZE;
        out.getContext('2d').drawImage(src, sx, sy, side, side, 0, 0, OUT_SIZE, OUT_SIZE);
        setCrop(out.toDataURL('image/jpeg', 0.85));
        setState('done');
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // Model failed to load / tfjs error: hard error, retry offered, no pass.
      setState('error');
    }
  };

  return (
    <>
      {onBack && <button className="backlink" onClick={onBack}>← {p(lang, 'back')}</button>}
      <div className="ob-icon">🤳</div>
      <h1 className="ob-q">{title || (lang === 'en' ? 'Selfie — verify your face' : 'Selfie — chehra verify karein')}</h1>
      <p className="hold-hint">{lang === 'en' ? 'Take your selfie. Your face should be clearly visible.' : 'Apni selfie lein. Chehra saaf nazar aana chahiye.'}</p>
      <p className="hold-hint">{lang === 'en' ? 'Only your face is saved — the background is cut off.' : 'Sirf chehra save hoga — peeche ka background kat jayega.'}</p>

      <input ref={camRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }}
        onChange={(e) => { processFile(e.target.files && e.target.files[0]); e.target.value = ''; }} />
      <input ref={upRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { processFile(e.target.files && e.target.files[0]); e.target.value = ''; }} />

      {state === 'done' && crop ? (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <img className="selfie-preview" src={crop} alt="Verified selfie" width={180} height={180} />
          <p style={{ fontWeight: 800, margin: '12px 0 0' }}>✓ {lang === 'en' ? 'Face verified' : 'Chehra verify ho gaya'}</p>
          <div className="sticky-action">
            <button className="btn btn-primary" onClick={() => onDone(crop)}>{lang === 'en' ? 'Continue →' : 'Aage →'}</button>
          </div>
          <button className="skip-link" onClick={() => { setState('idle'); setCrop(null); }}>↻ {lang === 'en' ? 'Retake selfie' : 'Dobara selfie lein'}</button>
        </div>
      ) : (
        <>
          <div className="selfie-frame" aria-hidden="true">{state === 'working' ? '⏳' : '🤳'}</div>
          {state === 'working' && <p className="hold-hint" aria-live="polite">{busyLabel}</p>}
          {state === 'noface' && (
            <div className="error-box" style={{ display: 'block' }} role="alert">
              ❌ {lang === 'en' ? 'No face found — take the selfie again' : 'Chehra nazar nahi aaya — dobara selfie lein'}
              <div className="small" style={{ marginTop: 4 }}>{lang === 'en' ? 'An account cannot be created without a verified face.' : 'Chehra verify kiye baghair account nahi ban sakta.'}</div>
            </div>
          )}
          {state === 'error' && (
            <div className="error-box" style={{ display: 'block' }} role="alert">
              ❌ {lang === 'en' ? 'Face check could not run. Check your connection and retry.' : 'Chehra check nahi ho saka. Connection check karke dobara try karein.'}
            </div>
          )}
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            <button className="btn btn-amber" disabled={state === 'working'} onClick={() => camRef.current && camRef.current.click()}>
              📷 {lang === 'en' ? 'Take Selfie' : 'Selfie Lein'}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%' }} disabled={state === 'working'} onClick={() => upRef.current && upRef.current.click()}>
              🖼️ {lang === 'en' ? 'Upload a photo' : 'Photo Upload Karein'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
