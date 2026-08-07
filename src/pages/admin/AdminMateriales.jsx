import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../firebase/config';
import { PLANTELES } from '../../data/planteles';
import EditorListaItems from '../../components/EditorListaItems';

/*
  Catálogo de materiales por plantel + grado: qué libros de texto se entregan,
  qué papelería se solicita y qué artículos de IBIMEshop corresponden. Se guarda
  en materialesPorGrado/{plantel}_{grado}. La pantalla de Entrega/Recepción arma
  el checklist automáticamente a partir de este catálogo según el grado del alumno.
*/
export default function AdminMateriales() {
  const [plantel, setPlantel] = useState(PLANTELES[0].id);
  const [grado, setGrado] = useState('1');
  const [librosTexto, setLibrosTexto] = useState([]);
  const [papeleria, setPapeleria] = useState([]);
  const [ibimeshop, setIbimeshop] = useState([]);
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
    const snap = await getDoc(doc(db, COLLECTIONS.MATERIALES_PLANTEL, idDoc));
    const datos = snap.exists() ? snap.data() : {};
    setLibrosTexto(datos.librosTexto || []);
    setPapeleria(datos.papeleria || []);
    setIbimeshop(datos.ibimeshop || []);
    setCargando(false);
  }

  async function guardar() {
    setGuardando(true);
    setMensaje('');
    try {
      await setDoc(doc(db, COLLECTIONS.MATERIALES_PLANTEL, idDoc), {
        plantel,
        grado: grado.trim(),
        librosTexto,
        papeleria,
        ibimeshop,
        actualizadoEn: serverTimestamp()
      });
      setMensaje('✅ Catálogo de materiales guardado.');
    } catch (err) {
      setMensaje('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h1>Materiales por grado</h1>
      <p className="texto-ayuda">
        Define, por plantel y grado, qué libros de texto se entregan (junto con libretas y agenda,
        que ya se agregan automáticamente), qué papelería se solicita y qué artículos de IBIMEshop
        corresponden. Esto alimenta el checklist de la pantalla de Entrega/Recepción.
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
          <h3>Materiales para {idDoc}</h3>

          <EditorListaItems
            titulo="Libros de texto (entrega)"
            items={librosTexto}
            onChange={setLibrosTexto}
            placeholder="Ej. Matemáticas 1"
          />
          <EditorListaItems
            titulo="Papelería solicitada (recepción)"
            items={papeleria}
            onChange={setPapeleria}
            placeholder="Ej. Resma de hojas blancas"
          />
          <EditorListaItems
            titulo="Artículos IBIMEshop (recepción)"
            items={ibimeshop}
            onChange={setIbimeshop}
            placeholder="Ej. Playera de educación física"
          />

          {mensaje && (
            <div className={mensaje.startsWith('✅') ? 'alerta alerta-exito' : 'alerta alerta-error'}>{mensaje}</div>
          )}

          <button className="btn btn-primario btn-ancho" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar catálogo de materiales'}
          </button>
        </div>
      )}
    </div>
  );
}
