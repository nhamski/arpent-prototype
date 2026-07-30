import { useState, useRef, useCallback, useEffect } from 'react';
import { referenceFromPreset, realLengthInches } from '../engine/scaling.js';
import { REFERENCE_OBJECT_LENGTHS_INCHES } from '../engine/constants.js';

const PRESETS = Object.entries(REFERENCE_OBJECT_LENGTHS_INCHES).map(([key, inches]) => ({
  key,
  label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  inches,
}));

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export default function PhotoMeasure() {
  const [show, setShow] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [preset, setPreset] = useState('forage_stick');
  const [phase, setPhase] = useState('ref1');
  const [refPoints, setRefPoints] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [pendingPoint, setPendingPoint] = useState(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  const refPixelLength = refPoints.length === 2 ? dist(refPoints[0], refPoints[1]) : 0;
  const calibrated = refPixelLength > 0;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgSrc(ev.target.result);
      setPhase('ref1');
      setRefPoints([]);
      setMeasurements([]);
      setPendingPoint(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleCanvasTap = useCallback((e) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (phase === 'ref1') {
      setRefPoints([pt]);
      setPhase('ref2');
    } else if (phase === 'ref2') {
      setRefPoints((prev) => [...prev, pt]);
      setPhase('measure1');
    } else if (phase === 'measure1') {
      setPendingPoint(pt);
      setPhase('measure2');
    } else if (phase === 'measure2') {
      if (pendingPoint) {
        const pxLen = dist(pendingPoint, pt);
        try {
          const ref = referenceFromPreset(preset, refPixelLength);
          const inches = realLengthInches(pxLen, ref);
          setMeasurements((prev) => [...prev, { from: pendingPoint, to: pt, inches }]);
        } catch { /* ignore */ }
      }
      setPendingPoint(null);
      setPhase('measure1');
    }
  }, [phase, pendingPoint, preset, refPixelLength, getCanvasPoint]);

  useEffect(() => {
    if (!imgSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    if (!img) return;

    const draw = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      if (refPoints.length >= 1) {
        ctx.beginPath();
        ctx.arc(refPoints[0].x, refPoints[0].y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#5E7038';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (refPoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(refPoints[0].x, refPoints[0].y);
        ctx.lineTo(refPoints[1].x, refPoints[1].y);
        ctx.strokeStyle = '#5E7038';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(refPoints[1].x, refPoints[1].y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#5E7038';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      for (const m of measurements) {
        ctx.beginPath();
        ctx.moveTo(m.from.x, m.from.y);
        ctx.lineTo(m.to.x, m.to.y);
        ctx.strokeStyle = '#C4793A';
        ctx.lineWidth = 3;
        ctx.stroke();
        const midX = (m.from.x + m.to.x) / 2;
        const midY = (m.from.y + m.to.y) / 2;
        ctx.font = `bold ${Math.max(16, canvas.width / 40)}px sans-serif`;
        ctx.fillStyle = '#F6F2EA';
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.strokeText(`${m.inches.toFixed(1)}"`, midX + 10, midY - 10);
        ctx.fillText(`${m.inches.toFixed(1)}"`, midX + 10, midY - 10);
      }

      if (pendingPoint) {
        ctx.beginPath();
        ctx.arc(pendingPoint.x, pendingPoint.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#C4793A';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    if (img.complete) draw();
    else img.onload = draw;
  }, [imgSrc, refPoints, measurements, pendingPoint]);

  const undo = () => {
    if (phase === 'measure2' && pendingPoint) {
      setPendingPoint(null);
      setPhase('measure1');
    } else if (measurements.length > 0) {
      setMeasurements((prev) => prev.slice(0, -1));
    } else if (refPoints.length === 2) {
      setRefPoints([]);
      setPhase('ref1');
    } else if (refPoints.length === 1) {
      setRefPoints([]);
      setPhase('ref1');
    }
  };

  const reset = () => {
    setRefPoints([]);
    setMeasurements([]);
    setPendingPoint(null);
    setPhase('ref1');
  };

  if (!show) {
    return (
      <div style={{ marginTop: 24 }}>
        <button className="act-btn outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShow(true)}>
          Measure Forage Height (Photo)
        </button>
      </div>
    );
  }

  const instruction = {
    ref1: 'Tap one end of the reference object',
    ref2: 'Tap the other end of the reference object',
    measure1: 'Tap the base of the forage to measure',
    measure2: 'Tap the top of the forage',
  }[phase];

  return (
    <div style={{ marginTop: 24 }}>
      <div className="sh">Photo Measurement</div>
      <p style={{ font: '400 14px/1.4 var(--sans)', color: 'var(--ink2)', marginBottom: 12 }}>
        Place a reference object (ruler, forage stick, fence post) next to the forage, take a photo,
        then tap both ends of the reference to calibrate. After calibration, tap any two points to measure.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />

      <div className="field" style={{ marginBottom: 12 }}>
        <label>Reference Object</label>
        <select
          value={preset}
          onChange={(e) => { setPreset(e.target.value); reset(); }}
          style={{ width: '100%', fontSize: 16, padding: '8px 10px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8 }}
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>{p.label} ({p.inches}")</option>
          ))}
        </select>
      </div>

      {!imgSrc ? (
        <button className="act-btn" style={{ width: '100%', justifyContent: 'center', background: 'var(--accent)', color: '#F6F2EA' }} onClick={() => fileRef.current?.click()}>
          Take Photo
        </button>
      ) : (
        <>
          <div style={{ font: '600 14px/1 var(--sans)', color: calibrated ? 'var(--ok)' : 'var(--accent)', textAlign: 'center', marginBottom: 8 }}>
            {instruction}
          </div>

          <div style={{ position: 'relative', width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <img ref={imgRef} src={imgSrc} style={{ display: 'none' }} />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasTap}
              style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
            />
          </div>

          {measurements.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title">Measurements</div>
              {measurements.map((m, i) => {
                const implausible = m.inches > 72;
                return (
                  <div key={i} className="cost-row">
                    <span className="cost-label">#{i + 1}</span>
                    <span className="cost-val" style={{ color: implausible ? 'var(--warn)' : undefined }}>
                      {m.inches.toFixed(1)}" ({(m.inches / 12).toFixed(1)} ft)
                      {implausible && ' ⚠ check calibration'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="act-btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={undo}>Undo</button>
            <button className="act-btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={reset}>Reset</button>
            <button className="act-btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => fileRef.current?.click()}>New Photo</button>
          </div>
        </>
      )}

      <button className="act-btn outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setShow(false)}>
        Hide Measurement Tool
      </button>
    </div>
  );
}
