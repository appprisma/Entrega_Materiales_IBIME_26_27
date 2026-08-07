import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db, COLLECTIONS } from '../firebase/config';
import { nombrePlantel } from '../data/planteles';
import EstadoBadge from '../components/EstadoBadge';

/*
  Búsqueda por matrícula usando la matrícula como ID del documento en Firestore.
  Con ~3500 alumnos, una lectura por documento (getDoc) es instantánea y barata,
  en vez de traer toda la colección al cliente. Si en el futuro se requiere buscar
  por nombre, se recomienda un índice de búsqueda aparte (p. ej. Algolia/Typesense)
  en lugar de "where" con texto libre en Firestore.
*/
export default function BusquedaAlumno() {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState('');
  const [alumno, setAlumno] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  async function buscar(e) {
    e.preventDefault();
    setError('');
    setAlumno(null);
    const m = matricula.trim().toUpperCase();
    if (!m) return;

    setBuscando(true);
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.ALUMNOS, m));
      if (!snap.exists()) {
        setError('No se encontró un alumno con esa matrícula.');
      } else {
        setAlumno({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      setError('Error al consultar la base de datos: ' + err.message);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="contenedor-angosto">
      <h1>Buscar alumno</h1>
      <p className="texto-ayuda">Escanea o escribe la matrícula del alumno para ver su estatus.</p>

      <form className="barra-busqueda" onSubmit={buscar}>
        <input
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          placeholder="Matrícula, ej. 24LAG0345"
          autoFocus
        />
        <button className="btn btn-primario" type="submit" disabled={buscando}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && <div className="alerta alerta-error">{error}</div>}

      {alumno && (
        <div className="tarjeta-alumno">
          <div className="tarjeta-alumno-header">
            <div>
              <h2>{alumno.nombre}</h2>
              <p>{nombrePlantel(alumno.plantel)} · {alumno.grado} {alumno.grupo}</p>
            </div>
            <EstadoBadge estatus={alumno.estatusPago} />
          </div>

          <dl className="ficha-datos">
            <div><dt>Matrícula</dt><dd>{alumno.id}</dd></div>
            <div><dt>Nivel</dt><dd>{alumno.nivel || '—'}</dd></div>
            <div><dt>Entrega de materiales (libros/libretas/agenda)</dt>
              <dd>{alumno.entregaRealizada ? `Entregado el ${formatearFecha(alumno.entregaFecha)}` : 'Pendiente'}</dd>
            </div>
            <div><dt>Recepción de papelería / IBIMEshop</dt>
              <dd>{alumno.recepcionRealizada ? `Recibido el ${formatearFecha(alumno.recepcionFecha)}` : 'Pendiente'}</dd>
            </div>
            <div><dt>Documentación</dt>
              <dd>{alumno.documentacionCompleta ? 'Completa' : 'Incompleta o pendiente de cotejar'}</dd>
            </div>
            {alumno.estatusPago === 'convenio' && (
              <div><dt>Convenio autorizado por</dt><dd>{alumno.convenioAutorizadoPorNombre} ({alumno.convenioAutorizadoPor})</dd></div>
            )}
          </dl>

          <button
            className="btn btn-primario btn-ancho"
            onClick={() => navigate(`/entrega/${alumno.id}`)}
          >
            Ir a entrega / recepción
          </button>
        </div>
      )}
    </div>
  );
}

function formatearFecha(ts) {
  if (!ts) return '';
  const fecha = ts.toDate ? ts.toDate() : new Date(ts);
  return fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}
