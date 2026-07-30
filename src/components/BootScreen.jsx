import { useEffect, useState } from 'react';
import './BootScreen.css';

export default function BootScreen({ onDone }) {
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOut(true), 1400);
    const t2 = setTimeout(() => onDone(), 1900);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`boot ${out ? 'out' : ''}`} role="presentation" aria-hidden="true">
      <div className="boot-inner">
        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="12" height="12" />
          <rect x="18" y="2" width="12" height="12" />
          <rect x="34" y="2" width="12" height="12" />
          <rect x="2" y="18" width="12" height="12" />
          <rect x="18" y="18" width="12" height="12" className="ctr" />
          <rect x="34" y="18" width="12" height="12" />
          <rect x="2" y="34" width="12" height="12" />
          <rect x="18" y="34" width="12" height="12" />
          <rect x="34" y="34" width="12" height="12" />
        </svg>
        <div className="boot-yr">1656</div>
        <div className="boot-nm">A R P E N T</div>
        <div className="boot-bar"><span /></div>
      </div>
    </div>
  );
}
