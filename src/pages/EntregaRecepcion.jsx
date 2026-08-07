import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { ESTATUS, TIPO_MOVIMIENTO, LEYENDA_MOVIMIENTO, nombrePlantel } from '../data/planteles';
import { registrarSalidaInventario } from '../utils/inventario';
import EstadoBadge from '../components/EstadoBadge';
import FirmaDigital from '../components/FirmaDigital';

const TABS = {
  ENTREGA: 'entrega', // escuela -> padre: libros, libretas, agenda
  RECEPCION: 'recepcion', // padre -> escuela: papelería + IBIMEshop
  DOCUMENTACION: 'documentacion' // padre -> escuela: acta, CURP, INE, etc.
};

export default function EntregaRecepcion() {
  const { matricula } = useParams();
  const { empleado } = useAuth();
  const padRef = useRef(null);

  const [alumno, setAlumno] = useState(null);
  const [materiales, setMateriales] = useState(null);
  const [documentosRequeridos, setDocumentosRequeridos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState(TABS.ENTREGA);
  const [seleccion, setSeleccion] = useState({});
  const [nombreRecibe, setNombreRecibe] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    cargarAlumno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matricula]);

  async function cargarAlumno() {
    setCargando(true);
    const snap = await getDoc(doc(db, COLLECTIONS.ALUMNOS, matricula));
    if (snap.exists()) {
      const datos = { id: snap.id, ...snap.data() };
      setAlumno(datos);

      const idCatalogo = `${datos.plantel}_${datos.grado}`;

      // Lista de materiales esperados para el nivel/grado del alumno.
      const matSnap = await getDoc(doc(db, COLLECTIONS.MATERIALES_PLANTEL, idCatalogo));
      setMateriales(matSnap.exists() ? matSnap.data() : { librosTexto: [], papeleria: [], ibimeshop: [] });

      // Lista de documentos requeridos para el nivel/grado del alumno.
      const docSnap = await getDoc(doc(db, COLLECTIONS.DOCUMENTOS_PLANTEL, idCatalogo));
      setDocumentosRequeridos(docSnap.exists() ? docSnap.data().documentos || [] : []);
    }
    setCargando(false);
  }

  if (cargando) return <div className="pantalla-carga">Cargando…</div>;
  if (!alumno) return <div className="alerta alerta-error">Alumno no encontrado. <Link to="/">Volver a buscar</Link></div>;

  const puedeEntregar =
    alumno.estatusPago === ESTATUS.AL_CORRIENTE || alumno.estatusPago === ESTATUS.CONVENIO;

  const documentosEntregados = alumno.documentosEntregados || {};
  const documentosFaltantes = documentosRequeridos.filter((d) => !documentosEntregados[d]);

  let listaActual = [];
  if (tab === TABS.ENTREGA) listaActual = [...(materiales.librosTexto || []), 'Libretas', 'Agenda escolar'];
  if (tab === TABS.RECEPCION) listaActual = [...(materiales.papeleria || []), ...(materiales.ibimeshop || [])];
  if (tab === TABS.DOCUMENTACION) listaActual = documentosRequeridos;

  function cambiarTab(nuevoTab) {
    setTab(nuevoTab);
    setMensaje('');
    if (nuevoTab === TABS.DOCUMENTACION) {
      // Precarga el checklist con lo que ya conste como entregado anteriormente.
      const inicial = {};
      documentosRequeridos.forEach((d) => { inicial[d] = !!documentosEntregados[d]; });
      setSeleccion(inicial);
    } else {
      setSeleccion({});
    }
  }

  function toggleItem(item) {
    setSeleccion((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  async function confirmar() {
    setMensaje('');

    if (tab === TABS.ENTREGA && !puedeEntregar) {
      setMensaje('No se puede completar la entrega: verificar situación en Contraloría.');
      return;
    }

    const itemsMarcados = listaActual.filter((item) => seleccion[item]);
    if (itemsMarcados.length === 0) {
      setMensaje('Marca al menos un elemento antes de confirmar.');
      return;
    }

    if (!nombreRecibe.trim()) {
      setMensaje('Escribe el nombre de quien entrega o recibe (padre/tutor).');
      return;
    }

    if (!padRef.current || padRef.current.isEmpty()) {
      setMensaje('Falta la firma del padre o tutor.');
      return;
    }

    setGuardando(true);
    try {
      const tipoMovimiento =
        tab === TABS.ENTREGA
          ? TIPO_MOVIMIENTO.ENTREGA_ESCUELA_A_PADRE
          : tab === TABS.RECEPCION
          ? TIPO_MOVIMIENTO.RECEPCION_PADRE_A_ESCUELA
          : TIPO_MOVIMIENTO.DOCUMENTACION_ENTREGADA;

      // 1) Subir firma a Storage
      const firmaDataUrl = padRef.current.toDataURL('image/png');
      const rutaFirma = `firmas/${alumno.id}/${tab}_${Date.now()}.png`;
      const firmaRef = ref(storage, rutaFirma);
      await uploadString(firmaRef, firmaDataUrl, 'data_url');
      const firmaURL = await getDownloadURL(firmaRef);

      // 2) Registrar movimiento en bitácora (trazabilidad total).
      // "notificado: false" es la marca que usa el corte de notificaciones por
      // correo cada 30 min / manual: solo se avisa lo que aún no se ha avisado.
      await addDoc(collection(db, COLLECTIONS.MOVIMIENTOS), {
        matricula: alumno.id,
        nombreAlumno: alumno.nombre,
        correoTutor: alumno.correoTutor || '',
        plantel: alumno.plantel,
        tipo: tipoMovimiento,
        leyenda: LEYENDA_MOVIMIENTO[tipoMovimiento],
        items: itemsMarcados,
        nombrePadreTutor: nombreRecibe.trim(),
        firmaURL,
        empleadoMatricula: empleado.matricula,
        empleadoNombre: empleado.nombre,
        fecha: serverTimestamp(),
        notificado: false
      });

      // 3) Actualizar estado resumido en el documento del alumno
      if (tab === TABS.DOCUMENTACION) {
        const nuevoMapa = { ...documentosEntregados };
        listaActual.forEach((d) => { nuevoMapa[d] = !!seleccion[d]; });
        const completa = documentosRequeridos.every((d) => nuevoMapa[d]);
        await updateDoc(doc(db, COLLECTIONS.ALUMNOS, alumno.id), {
          documentosEntregados: nuevoMapa,
          documentacionCompleta: completa,
          documentacionFecha: serverTimestamp(),
          documentacionRegistradaPor: empleado.matricula
        });
      } else {
        const campoFecha = tab === TABS.ENTREGA ? 'entregaFecha' : 'recepcionFecha';
        const campoFlag = tab === TABS.ENTREGA ? 'entregaRealizada' : 'recepcionRealizada';
        const campoEmpleado = tab === TABS.ENTREGA ? 'entregaRegistradaPor' : 'recepcionRegistradaPor';

        await updateDoc(doc(db, COLLECTIONS.ALUMNOS, alumno.id), {
          [campoFlag]: true,
          [campoFecha]: serverTimestamp(),
          [campoEmpleado]: empleado.matricula
        });

        // 4) Inventario: solo se descuenta en la pestaña de Entrega (libros/libretas/agenda).
        if (tab === TABS.ENTREGA) {
          await registrarSalidaInventario(alumno.plantel, itemsMarcados);
        }
      }

      setMensaje('✅ Movimiento guardado y firmado correctamente.');
      setSeleccion({});
      setNombreRecibe('');
      padRef.current.clear();
      cargarAlumno();
    } catch (err) {
      setMensaje('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="contenedor-angosto">
      <Link to="/" className="enlace-volver">← Buscar otro alumno</Link>

      <div className="tarjeta-alumno-header">
        <div>
          <h1>{alumno.nombre}</h1>
          <p>{nombrePlantel(alumno.plantel)} · {alumno.grado} {alumno.grupo} · Matrícula {alumno.id}</p>
        </div>
        <EstadoBadge estatus={alumno.estatusPago} />
      </div>

      {/* Alerta permanente de documentación faltante, visible sin importar la pestaña activa */}
      {documentosRequeridos.length > 0 && (
        documentosFaltantes.length > 0 ? (
          <div className="alerta alerta-error">
            ⚠ Documentación incompleta: faltan {documentosFaltantes.length} documento(s) — {documentosFaltantes.join(', ')}.
          </div>
        ) : (
          <div className="alerta alerta-exito">✅ Documentación completa.</div>
        )
      )}

      <div className="tabs">
        <button className={tab === TABS.ENTREGA ? 'tab activo' : 'tab'} onClick={() => cambiarTab(TABS.ENTREGA)}>
          Entrega (libros/libretas/agenda)
        </button>
        <button className={tab === TABS.RECEPCION ? 'tab activo' : 'tab'} onClick={() => cambiarTab(TABS.RECEPCION)}>
          Recepción (papelería/IBIMEshop)
        </button>
        <button className={tab === TABS.DOCUMENTACION ? 'tab activo' : 'tab'} onClick={() => cambiarTab(TABS.DOCUMENTACION)}>
          Documentación {documentosFaltantes.length > 0 ? `(faltan ${documentosFaltantes.length})` : ''}
        </button>
      </div>

      {tab === TABS.ENTREGA && !puedeEntregar && (
        <div className="alerta alerta-error">
          Este alumno no tiene la entrega aprobada. {alumno.estatusPago === ESTATUS.PENDIENTE
            ? 'Debe verificar su situación en Contraloría antes de continuar.'
            : ''}
        </div>
      )}

      <div className="lista-materiales">
        <h3>
          {tab === TABS.ENTREGA && 'Libros, libretas y agenda'}
          {tab === TABS.RECEPCION && 'Papelería solicitada / IBIMEshop'}
          {tab === TABS.DOCUMENTACION && 'Cotejo de documentos entregados'}
        </h3>
        {listaActual.length === 0 && (
          <p className="texto-ayuda">
            {tab === TABS.DOCUMENTACION
              ? 'No hay lista de documentos configurada para este grado todavía (ver panel de Admin).'
              : 'No hay lista configurada para este grado todavía.'}
          </p>
        )}
        {listaActual.map((item) => (
          <label key={item} className="fila-checkbox">
            <input type="checkbox" checked={!!seleccion[item]} onChange={() => toggleItem(item)} />
            {item}
            {tab === TABS.DOCUMENTACION && documentosEntregados[item] && !seleccion[item] && (
              <span className="texto-ayuda"> (previamente marcado como entregado)</span>
            )}
          </label>
        ))}
      </div>

      <label className="campo-ancho">
        Nombre de quien {tab === TABS.ENTREGA ? 'recibe' : 'entrega'} (padre / tutor)
        <input value={nombreRecibe} onChange={(e) => setNombreRecibe(e.target.value)} placeholder="Nombre completo" />
      </label>

      <div className="campo-ancho">
        <span className="etiqueta-firma">
          Firma del padre o tutor — {LEYENDA_MOVIMIENTO[
            tab === TABS.ENTREGA
              ? TIPO_MOVIMIENTO.ENTREGA_ESCUELA_A_PADRE
              : tab === TABS.RECEPCION
              ? TIPO_MOVIMIENTO.RECEPCION_PADRE_A_ESCUELA
              : TIPO_MOVIMIENTO.DOCUMENTACION_ENTREGADA
          ]}
        </span>
        <FirmaDigital padRef={padRef} />
      </div>

      {mensaje && (
        <div className={mensaje.startsWith('✅') ? 'alerta alerta-exito' : 'alerta alerta-error'}>{mensaje}</div>
      )}

      <button
        className="btn btn-primario btn-ancho"
        onClick={confirmar}
        disabled={guardando || (tab === TABS.ENTREGA && !puedeEntregar)}
      >
        {guardando ? 'Guardando…' : 'Confirmar y firmar'}
      </button>
    </div>
  );
}
