import { useEffect, useState } from 'react';
import { PLANTELES } from '../../data/planteles';
import { obtenerInventarioPlantel, guardarCantidadRecibida } from '../../utils/inventario';

/*
  Aquí se da de alta cuánto material llegó físicamente al plantel (recibido).
  Cada vez que en la pantalla de Entrega se confirma la entrega de un libro,
  libreta o agenda, el sistema descuenta automáticamente 1 del "disponible"
  (recibido - entregado). Este panel es solo para capturar lo recibido y ver
  el saldo; el descuento por entrega ya es automático.
*/
export default function AdminInventario() {
  const [plantel, setPlantel] = useState(PLANTELES[0].id);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [materialNuevo, setMaterialNuevo] = useState('');
  const [cantidadNueva, setCantidadNueva] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantel]);

  async function cargar() {
    setCargando(true);
    const datos = await obtenerInventarioPlantel(plantel);
    datos.sort((a, b) => a.material.localeCompare(b.material));
    setInventario(datos);
    setCargando(false);
  }

  async function actualizarRecibido(material, valor) {
    setGuardando(true);
    setMensaje('');
    try {
      await guardarCantidadRecibida(plantel, material, valor);
      await cargar();
      setMensaje(`✅ "${material}" actualizado.`);
    } catch (err) {
      setMensaje('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function agregarMaterial(e) {
    e.preventDefault();
    if (!materialNuevo.trim() || cantidadNueva === '') return;
    await actualizarRecibido(materialNuevo.trim(), cantidadNueva);
    setMaterialNuevo('');
    setCantidadNueva('');
  }

  return (
    <div>
      <h1>Inventario de materiales</h1>
      <p className="texto-ayuda">
        Captura cuántas piezas de cada libro, libreta o agenda llegaron al plantel. El sistema
        descuenta automáticamente conforme se van entregando en la pantalla de Entrega, para que el
        Dashboard muestre en tiempo real cuánto queda disponible.
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
      </div>

      {mensaje && (
        <div className={mensaje.startsWith('✅') ? 'alerta alerta-exito' : 'alerta alerta-error'}>{mensaje}</div>
      )}

      <form className="barra-busqueda" onSubmit={agregarMaterial}>
        <input
          value={materialNuevo}
          onChange={(e) => setMaterialNuevo(e.target.value)}
          placeholder="Nombre exacto del material (ej. Matemáticas 1)"
        />
        <input
          type="number"
          min="0"
          value={cantidadNueva}
          onChange={(e) => setCantidadNueva(e.target.value)}
          placeholder="Cantidad recibida"
          style={{ maxWidth: 160 }}
        />
        <button className="btn btn-secundario" type="submit" disabled={guardando}>Agregar / actualizar</button>
      </form>
      <p className="texto-ayuda">
        Tip: usa exactamente el mismo nombre que diste de alta en "Materiales por grado" para que el
        descuento automático empate con este renglón.
      </p>

      <div className="tarjeta-tabla">
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr><th>Material</th><th>Recibido</th><th>Entregado</th><th>Disponible</th><th>Actualizar recibido</th></tr>
            </thead>
            <tbody>
              {cargando && <tr><td colSpan={5} className="texto-ayuda">Cargando…</td></tr>}
              {!cargando && inventario.length === 0 && (
                <tr><td colSpan={5} className="texto-ayuda">Sin materiales dados de alta en este plantel.</td></tr>
              )}
              {inventario.map((item) => {
                const disponible = (item.recibido || 0) - (item.entregado || 0);
                return (
                  <tr key={item.id}>
                    <td>{item.material}</td>
                    <td>{item.recibido || 0}</td>
                    <td>{item.entregado || 0}</td>
                    <td style={{ color: disponible < 0 ? 'var(--rojo)' : 'inherit', fontWeight: 700 }}>{disponible}</td>
                    <td>
                      <FilaEditar material={item.material} valorActual={item.recibido || 0} onGuardar={actualizarRecibido} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilaEditar({ material, valorActual, onGuardar }) {
  const [valor, setValor] = useState(valorActual);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input type="number" min="0" value={valor} onChange={(e) => setValor(e.target.value)} style={{ width: 90 }} />
      <button className="btn btn-ghost btn-chico" onClick={() => onGuardar(material, valor)}>Guardar</button>
    </div>
  );
}
