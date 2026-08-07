import { useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { ESTATUS, TIPO_MOVIMIENTO, nombrePlantel } from '../data/planteles';
import EstadoBadge from '../components/EstadoBadge';

// Pantalla exclusiva de Contraloría: busca la matrícula y, si procede,
// la convierte a estatus "Convenio o Acuerdo", autorizando con la matrícula
// del propio contralor que tiene la sesión iniciada.
export default function Contraloria() {
  const { empleado } = useAuth();
  const [matricula, setMatricula] = useState('');
  const [alumno, setAlumno] = useState(null);
  const [nota, setNota] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function buscar(e) {
    e.preventDefault();
    setMensaje('');
    setAlumno(null);
    const m = matricula.trim().toUpperCase();
    if (!m) return;
    setBuscando(true);
    const snap = await getDoc(doc(db, COLLECTIONS.ALUMNOS, m));
    setBuscando(false);
    if (!snap.exists()) {
      setMensaje('No se encontró un alumno con esa matrícula.');
      return;
    }
    setAlumno({ id: snap.id, ...snap.data() });
  }

  async function autorizarConvenio() {
    if (!alumno) return;
    setGuardando(true);
    setMensaje('');
    try {
      await updateDoc(doc(db, COLLECTIONS.ALUMNOS, alumno.id), {
        estatusPago: ESTATUS.CONVENIO,
        convenioAutorizadoPor: empleado.matricula,
        convenioAutorizadoPorNombre: empleado.nombre,
        convenioNota: nota.trim(),
        convenioFecha: serverTimestamp()
      });

      await addDoc(collection(db, COLLECTIONS.MOVIMIENTOS), {
        matricula: alumno.id,
        nombreAlumno: alumno.nombre,
        plantel: alumno.plantel,
        tipo: TIPO_MOVIMIENTO.CONVENIO_AUTORIZADO,
        nota: nota.trim(),
        empleadoMatricula: empleado.matricula,
        empleadoNombre: empleado.nombre,
        fecha: serverTimestamp()
      });

      setMensaje('✅ Convenio autorizado. El alumno ya puede pasar a recolección.');
      setAlumno((prev) => ({ ...prev, estatusPago: ESTATUS.CONVENIO }));
      setNota('');
    } catch (err) {
      setMensaje('Error al autorizar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="contenedor-angosto">
      <h1>Contraloría · Autorización de convenios</h1>
      <p className="texto-ayuda">
        Sesión de autorización: <strong>{empleado.nombre}</strong> ({empleado.matricula})
      </p>

      <form className="barra-busqueda" onSubmit={buscar}>
        <input
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          placeholder="Matrícula del alumno"
          autoFocus
        />
        <button className="btn btn-primario" type="submit" disabled={buscando}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {mensaje && (
        <div className={mensaje.startsWith('✅') ? 'alerta alerta-exito' : 'alerta alerta-error'}>{mensaje}</div>
      )}

      {alumno && (
        <div className="tarjeta-alumno">
          <div className="tarjeta-alumno-header">
            <div>
              <h2>{alumno.nombre}</h2>
              <p>{nombrePlantel(alumno.plantel)} · {alumno.grado} {alumno.grupo}</p>
            </div>
            <EstadoBadge estatus={alumno.estatusPago} />
          </div>

          {alumno.estatusPago === ESTATUS.CONVENIO ? (
            <p className="texto-ayuda">
              Ya cuenta con convenio autorizado por {alumno.convenioAutorizadoPorNombre} ({alumno.convenioAutorizadoPor}).
            </p>
          ) : (
            <>
              <label className="campo-ancho">
                Nota / referencia del acuerdo (opcional)
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej. Convenio de pago a 3 meses, folio 1234"
                  rows={3}
                />
              </label>

              <button className="btn btn-primario btn-ancho" onClick={autorizarConvenio} disabled={guardando}>
                {guardando ? 'Guardando…' : `Autorizar convenio con matrícula ${empleado.matricula}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
