import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { db, functions, COLLECTIONS } from '../firebase/config';
import { PLANTELES, nombrePlantel, TIPO_MOVIMIENTO, etiquetaTipoMovimiento } from '../data/planteles';
import { exportarAExcel } from '../utils/exportExcel';
import { obtenerInventarioPlantel } from '../utils/inventario';

const HOY = new Date();
const INICIO_HOY = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());

export default function Dashboard() {
  const [plantelFiltro, setPlantelFiltro] = useState('todos');
  const [desde, setDesde] = useState(formatoInput(new Date(HOY.getFullYear(), HOY.getMonth(), 1)));
  const [hasta, setHasta] = useState(formatoInput(HOY));

  const [totalesPorPlantel, setTotalesPorPlantel] = useState([]);
  const [totalHoy, setTotalHoy] = useState(0);
  const [totalRango, setTotalRango] = useState(0);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [inventario, setInventario] = useState([]);
  const [cargandoInventario, setCargandoInventario] = useState(true);

  const [corteEnCurso, setCorteEnCurso] = useState(false);
  const [mensajeCorte, setMensajeCorte] = useState('');

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantelFiltro, desde, hasta]);

  useEffect(() => {
    cargarInventario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantelFiltro]);

  async function cargarDatos() {
    setCargando(true);
    const inicioRango = Timestamp.fromDate(new Date(desde + 'T00:00:00'));
    const finRango = Timestamp.fromDate(new Date(hasta + 'T23:59:59'));
    const inicioHoyTs = Timestamp.fromDate(INICIO_HOY);

    const planteles = plantelFiltro === 'todos' ? PLANTELES.map((p) => p.id) : [plantelFiltro];

    // Conteos por plantel usando getCountFromServer: NO descarga documentos,
    // solo el número — clave para que el dashboard no se vuelva lento con 3500+ alumnos.
    const conteos = await Promise.all(
      planteles.map(async (plantelId) => {
        const q = query(
          collection(db, COLLECTIONS.MOVIMIENTOS),
          where('plantel', '==', plantelId),
          where('tipo', '==', TIPO_MOVIMIENTO.ENTREGA_ESCUELA_A_PADRE),
          where('fecha', '>=', inicioRango),
          where('fecha', '<=', finRango)
        );
        const snap = await getCountFromServer(q);
        return { plantel: nombrePlantel(plantelId), total: snap.data().count };
      })
    );
    setTotalesPorPlantel(conteos);
    setTotalRango(conteos.reduce((acc, c) => acc + c.total, 0));

    // Entregas efectivas del día (todos los planteles o el filtrado)
    let qHoy = query(
      collection(db, COLLECTIONS.MOVIMIENTOS),
      where('tipo', '==', TIPO_MOVIMIENTO.ENTREGA_ESCUELA_A_PADRE),
      where('fecha', '>=', inicioHoyTs)
    );
    if (plantelFiltro !== 'todos') {
      qHoy = query(qHoy, where('plantel', '==', plantelFiltro));
    }
    const snapHoy = await getCountFromServer(qHoy);
    setTotalHoy(snapHoy.data().count);

    // Últimos movimientos para la tabla / exportación (limitado a 500 más recientes del rango)
    let qLista = query(
      collection(db, COLLECTIONS.MOVIMIENTOS),
      where('fecha', '>=', inicioRango),
      where('fecha', '<=', finRango),
      orderBy('fecha', 'desc'),
      limit(500)
    );
    const snapLista = await getDocs(qLista);
    let filas = snapLista.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (plantelFiltro !== 'todos') {
      filas = filas.filter((f) => f.plantel === plantelFiltro);
    }
    setMovimientos(filas);

    setCargando(false);
  }

  async function cargarInventario() {
    setCargandoInventario(true);
    if (plantelFiltro === 'todos') {
      const listas = await Promise.all(PLANTELES.map((p) => obtenerInventarioPlantel(p.id)));
      setInventario(listas.flat());
    } else {
      setInventario(await obtenerInventarioPlantel(plantelFiltro));
    }
    setCargandoInventario(false);
  }

  const datosGrafica = useMemo(
    () => totalesPorPlantel.map((t) => ({ plantel: t.plantel.replace('Plantel ', 'P.'), total: t.total })),
    [totalesPorPlantel]
  );

  const inventarioAgrupado = useMemo(() => {
    const mapa = {};
    inventario.forEach((item) => {
      if (!mapa[item.material]) mapa[item.material] = { material: item.material, recibido: 0, entregado: 0 };
      mapa[item.material].recibido += item.recibido || 0;
      mapa[item.material].entregado += item.entregado || 0;
    });
    return Object.values(mapa).sort((a, b) => a.material.localeCompare(b.material));
  }, [inventario]);

  function exportar() {
    const filas = movimientos.map((m) => ({
      Matricula: m.matricula,
      Alumno: m.nombreAlumno,
      Plantel: nombrePlantel(m.plantel),
      Tipo: etiquetaTipoMovimiento(m.tipo),
      Items: (m.items || []).join(', '),
      'Padre/Tutor': m.nombrePadreTutor || '',
      'Registrado por': `${m.empleadoNombre || ''} (${m.empleadoMatricula || ''})`,
      Notificado: m.notificado ? 'Sí' : 'No',
      Fecha: m.fecha?.toDate ? m.fecha.toDate().toLocaleString('es-MX') : ''
    }));
    exportarAExcel(filas, 'ibime_movimientos');
  }

  function exportarInventario() {
    const filas = inventarioAgrupado.map((i) => ({
      Material: i.material,
      Recibido: i.recibido,
      Entregado: i.entregado,
      Disponible: i.recibido - i.entregado
    }));
    exportarAExcel(filas, 'ibime_inventario');
  }

  // Dispara el "corte" manual: llama a la Cloud Function que envía por correo,
  // a cada padre/tutor, lo que se le entregó/recibió desde el último corte, y
  // marca esos movimientos como "notificado" para que el corte automático de
  // cada 30 min (o el siguiente corte manual) no los vuelva a enviar.
  async function enviarCorteAhora() {
    setCorteEnCurso(true);
    setMensajeCorte('');
    try {
      const ejecutar = httpsCallable(functions, 'ejecutarCorteManual');
      const resp = await ejecutar();
      const { enviados, saltados } = resp.data || {};
      setMensajeCorte(`✅ Corte enviado: ${enviados || 0} correo(s) enviados, ${saltados || 0} sin correo de contacto.`);
    } catch (err) {
      setMensajeCorte(
        'No se pudo enviar el corte: ' + err.message +
        ' (revisa que la función "ejecutarCorteManual" esté desplegada — ver README > Corte de notificaciones).'
      );
    } finally {
      setCorteEnCurso(false);
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secundario" onClick={enviarCorteAhora} disabled={corteEnCurso}>
            {corteEnCurso ? 'Enviando corte…' : '📧 Enviar corte ahora'}
          </button>
          <button className="btn btn-secundario" onClick={exportar} disabled={movimientos.length === 0}>
            Exportar movimientos a Excel
          </button>
        </div>
      </div>

      {mensajeCorte && (
        <div className={mensajeCorte.startsWith('✅') ? 'alerta alerta-exito' : 'alerta alerta-error'}>{mensajeCorte}</div>
      )}
      <p className="texto-ayuda">
        El corte automático también se envía solo cada 30 minutos; este botón lo adelanta manualmente.
        A quien ya se le avisó no se le vuelve a notificar en el siguiente corte.
      </p>

      <div className="filtros">
        <label>
          Plantel
          <select value={plantelFiltro} onChange={(e) => setPlantelFiltro(e.target.value)}>
            <option value="todos">Todos los planteles</option>
            {PLANTELES.map((p) => (
              <option key={p.id} value={p.id}>Plantel {p.numero} - {p.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>

      <div className="tarjetas-kpi">
        <div className="kpi">
          <span className="kpi-valor">{cargando ? '…' : totalHoy}</span>
          <span className="kpi-etiqueta">Entregas efectivas hoy</span>
        </div>
        <div className="kpi">
          <span className="kpi-valor">{cargando ? '…' : totalRango}</span>
          <span className="kpi-etiqueta">Entregas efectivas en el rango</span>
        </div>
        <div className="kpi">
          <span className="kpi-valor">{cargando ? '…' : movimientos.length}</span>
          <span className="kpi-etiqueta">Movimientos listados (máx. 500)</span>
        </div>
      </div>

      <div className="tarjeta-grafica">
        <h3>Entregas por plantel</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datosGrafica}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f0" />
            <XAxis dataKey="plantel" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#2f6fed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="tarjeta-tabla">
        <div className="dashboard-header" style={{ marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>
            Inventario disponible {plantelFiltro !== 'todos' ? `· ${nombrePlantel(plantelFiltro)}` : '(todos los planteles)'}
          </h3>
          <button className="btn btn-ghost btn-chico" onClick={exportarInventario} disabled={inventarioAgrupado.length === 0}>
            Exportar inventario
          </button>
        </div>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr><th>Material</th><th>Recibido</th><th>Entregado</th><th>Disponible</th></tr>
            </thead>
            <tbody>
              {cargandoInventario && <tr><td colSpan={4} className="texto-ayuda">Cargando…</td></tr>}
              {!cargandoInventario && inventarioAgrupado.length === 0 && (
                <tr><td colSpan={4} className="texto-ayuda">Sin inventario dado de alta (ver panel de Admin → Inventario).</td></tr>
              )}
              {inventarioAgrupado.map((i) => {
                const disponible = i.recibido - i.entregado;
                return (
                  <tr key={i.material}>
                    <td>{i.material}</td>
                    <td>{i.recibido}</td>
                    <td>{i.entregado}</td>
                    <td style={{ color: disponible < 0 ? 'var(--rojo)' : 'inherit', fontWeight: 700 }}>{disponible}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tarjeta-tabla">
        <h3>Movimientos recientes</h3>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Matrícula</th><th>Alumno</th><th>Plantel</th><th>Tipo</th><th>Registrado por</th><th>Avisado</th><th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td>{m.matricula}</td>
                  <td>{m.nombreAlumno}</td>
                  <td>{nombrePlantel(m.plantel)}</td>
                  <td>{etiquetaTipoMovimiento(m.tipo)}</td>
                  <td>{m.empleadoNombre} ({m.empleadoMatricula})</td>
                  <td>{m.notificado ? '✅' : '—'}</td>
                  <td>{m.fecha?.toDate ? m.fecha.toDate().toLocaleString('es-MX') : '—'}</td>
                </tr>
              ))}
              {!cargando && movimientos.length === 0 && (
                <tr><td colSpan={7} className="texto-ayuda">Sin movimientos en este rango.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatoInput(fecha) {
  return fecha.toISOString().slice(0, 10);
}
