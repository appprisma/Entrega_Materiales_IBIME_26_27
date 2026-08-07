import { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase/config';

/*
  Acceso al panel de Administración de catálogos (/admin/*): documentos requeridos
  por grado, materiales por grado e inventario. Es una SEGUNDA clave, distinta de
  la clave general de entrega, pensada para quien administra los catálogos
  (coordinación / sistemas), no para todo el personal de mostrador.

  Igual que con la clave general, esto es una barrera del lado del cliente: la
  protección real de los datos la dan las reglas de Firestore (ver nota de
  seguridad en firestore.rules). Esta clave evita que el personal de entrega
  entre "por accidente" a modificar catálogos, y sirve como candado operativo.
*/

const AdminContext = createContext(null);
const STORAGE_KEY = 'ibime_sesion_admin';
const CLAVE_ADMIN = import.meta.env.VITE_CLAVE_ADMIN;

export function AdminProvider({ children }) {
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    setAutorizado(sessionStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  async function entrarAdmin(clave) {
    if (clave !== CLAVE_ADMIN) {
      throw new Error('Clave de administración incorrecta.');
    }
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    sessionStorage.setItem(STORAGE_KEY, '1');
    setAutorizado(true);
  }

  function salirAdmin() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAutorizado(false);
  }

  return (
    <AdminContext.Provider value={{ autorizado, entrarAdmin, salirAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin debe usarse dentro de <AdminProvider>');
  return ctx;
}
