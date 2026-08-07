import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase/config';
import { slugItem } from '../data/planteles';

// ID determinístico del documento de inventario de un material en un plantel.
export function idInventario(plantel, material) {
  return `${plantel}_${slugItem(material)}`;
}

// Trae todo el inventario de un plantel (para el panel de Admin y el Dashboard).
export async function obtenerInventarioPlantel(plantel) {
  const q = query(collection(db, COLLECTIONS.INVENTARIO), where('plantel', '==', plantel));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Da de alta o corrige la cantidad RECIBIDA de un material (desde Admin, cuando
// llega la remesa de libros/libretas/agendas de un plantel). No toca lo ya entregado.
export async function guardarCantidadRecibida(plantel, material, cantidadRecibida) {
  const ref = doc(db, COLLECTIONS.INVENTARIO, idInventario(plantel, material));
  await setDoc(
    ref,
    {
      plantel,
      material,
      recibido: Number(cantidadRecibida) || 0,
      actualizadoEn: serverTimestamp()
    },
    { merge: true }
  );
}

// Descuenta 1 del inventario disponible por cada material entregado. Si el
// material no tenía inventario dado de alta, crea el documento con recibido: 0
// para que quede visible en el Dashboard que se entregó algo sin stock
// registrado (se verá en números negativos como alerta).
export async function registrarSalidaInventario(plantel, materiales) {
  const tareas = materiales.map(async (material) => {
    const ref = doc(db, COLLECTIONS.INVENTARIO, idInventario(plantel, material));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        plantel,
        material,
        recibido: 0,
        entregado: 1,
        actualizadoEn: serverTimestamp()
      });
    } else {
      await updateDoc(ref, {
        entregado: increment(1),
        actualizadoEn: serverTimestamp()
      });
    }
  });
  await Promise.all(tareas);
}
