import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../firebase/config';
import { PLANTELES } from '../../data/planteles';
import EditorListaItems from '../../components/EditorListaItems';

/*
  Catálogo de documentos que debe entregar cada alumno según su plantel + grado
  (Acta de nacimiento, CURP, certificado, boleta, INE papá/mamá, comprobante de
  domicilio, etc.). Se guarda en documentosPorGrado/{plantel}_{grado} como un
  arreglo de nombres. La pantalla de Entrega/Recepción (pestaña "Documentación")
  lee este catálogo para saber qué debe cotejar con cada alumno.
*/
export default function AdminDocumentos() {
  const [plantel, setPlantel] = useState(PLANTELES[0].id);
  const [grado, setGrado] = useState('1');
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const idDoc = `${plantel}_${grado.trim()}`;

  useEffect(() => {
    if (grado.trim()) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantel, grado]);

  async function cargar() {
    setCargando(true);
    setMensaje('');
    const snap = await getDoc(doc(db, COLLECTIONS.DOCUMENTOS_PLANTEL, idDoc));
    setDocumentos(snap.exists() ? snap.data().documentos || [] : []);
    setCargando(false);
  }

  async function guardar() {
    setGuardando(true);
    setMensaje('');
    try {
      await setDoc(doc(db, COLLECTIONS.DOCUMENTOS_PLANTEL, idDoc), {
        plantel,
        grado: grado.trim(),
        documentos,
        actualizadoEn: serverTimestamp()
      });
      setMensaje('✅ Lista de documentos guardada.');
    } catch (err) {
      setMensaje('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h1>Documentos requeridos por grado</h1>
      <p className="texto-ayuda">
        Define qué documentos debe entregar cada alumno según su plantel y grado. Esta lista es la
        que se coteja automáticamente en la pestaña "Documentación" al momento de la entrega.
      </p>

      <div className="filtros">
        <label>
          Plantel
          <select value={plantel} onChange={(e) => setPlantel(e.target.value)}>
            {PLANTELES.map((p) => (
              <option key={p.id} value={p.id}>Plantel {p.numero} - {p.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Grado
          <input value={grado} onChange={(e) => setGrado(e.target.value)} placeholder="Ej. 1" />
        </label>
      </div>

      {cargando ? (
        <p className="texto-ayuda">Cargando…</p>
      ) : (
        <div className="tarjeta-alumno">
          <h3>Documentos para {idDoc}</h3>

          <EditorListaItems
            items={documentos}
            onChange={setDocumentos}
            placeholder="Ej. Acta de nacimiento"
          />

          {mensaje && (
            <div className={mensaje.startsWith('✅') ? 'alerta alerta-exito' : 'alerta alerta-error'}>{mensaje}</div>
          )}

          <button className="btn btn-primario btn-ancho" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar lista de documentos'}
          </button>
        </div>
      )}
    </div>
  );
}
