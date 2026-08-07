import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import AdminGate from './AdminGate';

export default function AdminLayout() {
  const { salirAdmin } = useAdmin();

  return (
    <AdminGate>
      <div className="app-shell">
        <header className="app-header">
          <div className="marca">
            <span className="marca-punto" />
            IBIME <span className="marca-sub">Panel de Administración</span>
          </div>
          <nav className="app-nav">
            <NavLink to="/admin/documentos" end>Documentos por grado</NavLink>
            <NavLink to="/admin/materiales">Materiales por grado</NavLink>
            <NavLink to="/admin/inventario">Inventario</NavLink>
          </nav>
          <div className="usuario-actual">
            <Link to="/" className="btn btn-ghost">← Volver a la plataforma</Link>
            <button className="btn btn-ghost" onClick={salirAdmin}>Salir de admin</button>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </AdminGate>
  );
}
