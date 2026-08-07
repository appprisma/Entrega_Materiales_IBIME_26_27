import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { nombrePlantel } from '../data/planteles';

export default function Layout() {
  const { empleado, cerrarSesion } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="marca">
          <span className="marca-punto" />
          IBIME <span className="marca-sub">Entrega &amp; Recepción</span>
        </div>

        <nav className="app-nav">
          <NavLink to="/" end>Buscar alumno</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          {(empleado.rol === 'contraloria' || empleado.rol === 'admin') && (
            <NavLink to="/contraloria">Contraloría</NavLink>
          )}
          {empleado.rol === 'admin' && <NavLink to="/importar">Importar datos</NavLink>}
          {empleado.rol === 'admin' && <Link to="/admin/documentos">Catálogos (Admin)</Link>}
        </nav>

        <div className="usuario-actual">
          <div className="usuario-info">
            <strong>{empleado.nombre}</strong>
            <span>{empleado.matricula} · {nombrePlantel(empleado.plantel)}</span>
          </div>
          <button className="btn btn-ghost" onClick={cerrarSesion}>Salir</button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
