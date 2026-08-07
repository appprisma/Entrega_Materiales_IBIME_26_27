/**
 * Script de una sola vez para dar de alta a los empleados que podrán iniciar
 * sesión en IBIME (entrega, contraloría, admin).
 *
 * Uso:
 *   1) npm install firebase-admin
 *   2) Descarga una clave de cuenta de servicio desde Firebase Console >
 *      Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.
 *      Guárdala como "serviceAccountKey.json" en esta misma carpeta (NO subir a GitHub).
 *   3) Ajusta el arreglo EMPLEADOS de abajo con tu lista real.
 *   4) node ejemplos/sembrar_empleados.js
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const EMPLEADOS = [
  { matricula: 'E1001', nombre: 'Juana Pérez López', plantel: 'plantel_1_lagos', rol: 'entrega' },
  { matricula: 'E1002', nombre: 'Carlos Medina Solís', plantel: 'plantel_2_montes_primaria', rol: 'entrega' },
  { matricula: 'C2001', nombre: 'Laura Contreras Díaz', plantel: 'plantel_1_lagos', rol: 'contraloria' },
  { matricula: 'A0001', nombre: 'Roberto Aguilar Nuñez', plantel: 'plantel_1_lagos', rol: 'admin' }
];

async function sembrar() {
  const batch = db.batch();
  EMPLEADOS.forEach((emp) => {
    const ref = db.collection('empleados').doc(emp.matricula);
    batch.set(ref, emp, { merge: true });
  });
  await batch.commit();
  console.log(`Listo: ${EMPLEADOS.length} empleados dados de alta.`);
}

sembrar().catch((err) => {
  console.error('Error al sembrar empleados:', err);
  process.exit(1);
});
