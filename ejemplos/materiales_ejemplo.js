// Ejemplo de documentos para la colección "materialesPorGrado".
// El ID de cada documento debe ser: `${plantel}_${grado}`  (ej. "plantel_1_lagos_1")
// Súbelos manualmente en Firebase Console, o adapta ejemplos/sembrar_empleados.js
// para escribir esta colección en lugar de "empleados".

const MATERIALES_EJEMPLO = {
  'plantel_1_lagos_1': {
    librosTexto: ['Español 1', 'Matemáticas 1', 'Ciencias Naturales 1', 'Inglés 1'],
    papeleria: ['Resma de hojas blancas', '2 cajas de colores', 'Pegamento en barra x2', 'Tijeras punta redonda'],
    ibimeshop: ['Playera de educación física', 'Cuaderno de tareas oficial IBIME']
  },
  'plantel_3_montes_secundaria_2': {
    librosTexto: ['Álgebra', 'Historia Universal II', 'Biología', 'English Grammar 2'],
    papeleria: ['Calculadora científica', '3 folders tamaño carta', 'Marcatextos x4'],
    ibimeshop: ['Chaleco institucional', 'Agenda de secundaria']
  }
};

module.exports = { MATERIALES_EJEMPLO };
