import { useState } from 'react';
import { doc, writeBatch, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { PLANTELES, TIPO_MOVIMIENTO } from '../data/planteles';
import { leerArchivo } from '../utils/importarArchivo';

/*
  Importación masiva de alumnos / estatus de pago.
  - Acepta .csv o .xlsx con columnas: matricula, nombre, plantel, grado, grupo, nivel, estatusPago
  - "plantel" debe venir con el id exacto del catálogo (ver tabla de ayuda abajo),
    o se puede mapear antes de subir el archivo.
  - Usa Firestore writeBatch en lotes de 450 documentos (el límite de Firestore es 500
    operaciones por batch) para poder cargar los ~3500 alumnos sin saturar el navegador.
  - Este importador SOBRESCRIBE el estatusPago y los datos generales; no toca los campos
    de entregaRealizada/recepcionRealizada para no perder el historial de entregas ya hechas.
*/
const TAMANO_LOTE = 450;

export default function ImportarDatos() {
  const { empleado } = useAuth();
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState('');
  const [error, setError] = useState('');

  async function onArchivoSeleccionado(e) {
    setError('');
    setResultado('');
    const file = e.target.files[0];
    if (!file) return;
    setArchivo(file);
    try {
      const filas = await leerArchivo(file);
      setVista(filas);
    } catch (err) {
      setError('No se pudo leer el archivo: ' + err.message);
      setVista([]);
    }
  }

  async function confirmarImportacion() {
    if (vista.length === 0) return;
    setProcesando(true);
    setProgreso(0);
    setError('');

    try {
      for (let i = 0; i < vista.length; i += TAMANO_LOTE) {
        const lote = vista.slice(i, i + TAMANO_LOTE);
        const batch = writeBatch(db);

        lote.forEach((alumno) => {
          const ref = doc(db, COLLECTIONS.ALUMNOS, alumno.matricula);
          batch.set(
            ref,
            {
              nombre: alumno.nombre,
              plantel: alumno.plantel,
              grado: alumno.grado,
              grupo: alumno.grupo,
              nivel: alumno.nivel,
              estatusPago: alumno.estatusPago,
              correoTutor: alumno.correoTutor || '',
              actualizadoPor: empleado.matricula,
              actualizadoEn: serverTimestamp()
            },
            { merge: true }
          );
        });

        await batch.commit();
        setProgreso(Math.min(i + TAMANO_LOTE, vista.length));
      }

      await addDoc(collection(db, COLLECTIONS.MOVIMIENTOS), {
        tipo: TIPO_MOVIMIENTO.IMPORTACION_PAGOS,
        totalRegistros: vista.length,
        archivo: archivo?.name || '',
        empleadoMatricula: empleado.matricula,
        empleadoNombre: empleado.nombre,
        fecha: serverTimestamp()
      });

      setResultado(`✅ Se importaron/actualizaron ${vista.length} alumnos correctamente.`);
      setVista([]);
      setArchivo(null);
    } catch (err) {
      setError('Error durante la importación: ' + err.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div>
      <h1>Importar alumnos y estatus de pago</h1>
      <p className="texto-ayuda">
        Sube el archivo (.csv o .xlsx) que te compartan con la base de alumnos y su estatus de pago.
        Columnas esperadas: <code>matricula, nombre, plantel, grado, grupo, nivel, estatusPago, correoTutor</code>.
        La columna <code>correoTutor</code> es la que se usa para enviarle al padre/tutor el "corte" de
        evidencia de entregas y recepciones.
      </p>

      <details className="detalle-ids">
        <summary>Ver los IDs de plantel que debe usar la columna "plantel"</summary>
        <ul>
          {PLANTELES.map((p) => (
            <li key={p.id}><code>{p.id}</code> — Plantel {p.numero} {p.nombre}</li>
          ))}
        </ul>
      </details>

      <input type="file" accept=".csv,.xlsx,.xls" onChange={onArchivoSeleccionado} />

      {error && <div className="alerta alerta-error">{error}</div>}
      {resultado && <div className="alerta alerta-exito">{resultado}</div>}

      {vista.length > 0 && (
        <>
          <p className="texto-ayuda">{vista.length} registros detectados. Vista previa de los primeros 10:</p>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr><th>Matrícula</th><th>Nombre</th><th>Plantel</th><th>Grado</th><th>Grupo</th><th>Estatus</th><th>Correo tutor</th></tr>
              </thead>
              <tbody>
                {vista.slice(0, 10).map((a) => (
                  <tr key={a.matricula}>
                    <td>{a.matricula}</td><td>{a.nombre}</td><td>{a.plantel}</td><td>{a.grado}</td><td>{a.grupo}</td><td>{a.estatusPago}</td><td>{a.correoTutor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="btn btn-primario btn-ancho" onClick={confirmarImportacion} disabled={procesando}>
            {procesando ? `Importando… (${progreso}/${vista.length})` : `Confirmar importación de ${vista.length} alumnos`}
          </button>
        </>
      )}
    </div>
  );
}
