import { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';

// Captura la firma del padre/tutor en un canvas. Expone getPngDataUrl() vía ref
// para que el componente padre la convierta a Blob y la suba a Storage.
export default function FirmaDigital({ padRef, alto = 220 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = alto * ratio;
    canvas.getContext('2d').scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      backgroundColor: '#ffffff',
      penColor: '#12203b'
    });
    padRef.current = pad;

    return () => pad.off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="firma-caja">
      <canvas ref={canvasRef} style={{ width: '100%', height: alto }} />
      <button
        type="button"
        className="btn btn-ghost btn-chico"
        onClick={() => padRef.current?.clear()}
      >
        Borrar firma
      </button>
    </div>
  );
}
