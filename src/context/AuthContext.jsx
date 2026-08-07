import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth, COLLECTIONS } from '../firebase/config';

/*
  Modelo de acceso solicitado: el personal entra con su MATRÍCULA DE EMPLEADO
  + una clave general del ciclo escolar (VITE_CLAVE_GENERAL_ENTREGA).
  La matrícula debe existir en la colección "empleados" en Firestore, con esto:
    {
      matricula: "E1023",
      nombre: "Juana Pérez",
      plantel: "plantel_1_lagos",
      rol: "entrega" | "contraloria" | "admin"
    }

  IMPORTANTE (seguridad): esta clave general resuelve el requerimiento funcional
  de "una sola contraseña para todo el personal", pero la matrícula + clave por
  sí solas NO bastan para proteger Firestore, porque las reglas de seguridad no
  pueden leer ese estado de React. Por eso, en cuanto la matrícula es válida,
  también se abre una sesión anónima de Firebase Auth (signInAnonymously). Así,
  firestore.rules puede exigir "request.auth != null" en cada escritura, y un
  visitante que nunca pasó por el formulario de login no puede escribir nada,
  aunque conozca la URL del sitio.
  Para un nivel de seguridad mayor (ideal a mediano plazo): mover la validación
  de matrícula + clave a una Cloud Function que genere un Custom Token por
  matrícula, y usar ese rol (empleados/entrega/contraloria/admin) como Custom
  Claim para que las reglas validen también el ROL del lado del servidor.
  Ver README > "Siguiente nivel de seguridad".
*/

const AuthContext = createContext(null);
const STORAGE_KEY = 'ibime_sesion_empleado';
const CLAVE_GENERAL = import.meta.env.VITE_CLAVE_GENERAL_ENTREGA;

export function AuthProvider({ children }) {
  const [empleado, setEmpleado] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Espera a que Firebase resuelva si ya hay una sesión anónima activa
    // antes de restaurar al empleado guardado, para no disparar lecturas
    // de Firestore sin "request.auth" todavía listo.
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado) {
          try {
            setEmpleado(JSON.parse(guardado));
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } else {
        setEmpleado(null);
      }
      setCargando(false);
    });
    return unsub;
  }, []);

  async function iniciarSesion(matricula, clave) {
    const matriculaLimpia = matricula.trim().toUpperCase();

    if (clave !== CLAVE_GENERAL) {
      throw new Error('Clave incorrecta.');
    }

    // Abre (o reutiliza) la sesión anónima de Firebase para que las
    // reglas de Firestore/Storage tengan un request.auth válido.
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const ref = doc(db, COLLECTIONS.EMPLEADOS, matriculaLimpia);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error('Matrícula de empleado no encontrada. Verifica con Sistemas.');
    }

    const datos = { id: snap.id, ...snap.data() };
    setEmpleado(datos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    return datos;
  }

  function cerrarSesion() {
    setEmpleado(null);
    localStorage.removeItem(STORAGE_KEY);
    auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ empleado, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
