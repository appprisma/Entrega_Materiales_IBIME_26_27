import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BusquedaAlumno from './pages/BusquedaAlumno';
import EntregaRecepcion from './pages/EntregaRecepcion';
import Contraloria from './pages/Contraloria';
import ImportarDatos from './pages/ImportarDatos';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDocumentos from './pages/admin/AdminDocumentos';
import AdminMateriales from './pages/admin/AdminMateriales';
import AdminInventario from './pages/admin/AdminInventario';

function RutaProtegida({ children, rolesPermitidos }) {
  const { empleado, cargando } = useAuth();

  if (cargando) return <div className="pantalla-carga">Cargando…</div>;
  if (!empleado) return <Navigate to="/login" replace />;
  if (rolesPermitidos && !rolesPermitidos.includes(empleado.rol)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const { empleado } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={empleado ? <Navigate to="/" replace /> : <Login />} />

      <Route
        path="/"
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<BusquedaAlumno />} />
        <Route path="entrega/:matricula" element={<EntregaRecepcion />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="contraloria"
          element={
            <RutaProtegida rolesPermitidos={['contraloria', 'admin']}>
              <Contraloria />
            </RutaProtegida>
          }
        />
        <Route
          path="importar"
          element={
            <RutaProtegida rolesPermitidos={['admin']}>
              <ImportarDatos />
            </RutaProtegida>
          }
        />
      </Route>

      {/*
        El panel de Admin tiene su propia contraseña (VITE_CLAVE_ADMIN) y no
        depende de que haya una sesión de empleado iniciada: es un "apartado"
        aparte para quien administra catálogos (documentos, materiales, inventario).
      */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="documentos" replace />} />
        <Route path="documentos" element={<AdminDocumentos />} />
        <Route path="materiales" element={<AdminMateriales />} />
        <Route path="inventario" element={<AdminInventario />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
