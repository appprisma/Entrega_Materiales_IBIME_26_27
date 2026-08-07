// Ejemplo de documentos para la colección "documentosPorGrado".
// El ID de cada documento debe ser: `${plantel}_${grado}`  (ej. "plantel_1_lagos_1")
// En la práctica, esto se captura desde el panel /admin → "Documentos por grado",
// no hace falta cargarlo a mano; este archivo es solo referencia del formato.

const DOCUMENTOS_EJEMPLO = {
  'plantel_1_lagos_1': {
    documentos: [
      'Acta de nacimiento',
      'CURP del alumno',
      'Comprobante de domicilio',
      'INE papá',
      'INE mamá'
    ]
  },
  'plantel_3_montes_secundaria_2': {
    documentos: [
      'Acta de nacimiento',
      'CURP del alumno',
      'Certificado de primaria',
      'Boleta de 6to',
      'Comprobante de domicilio',
      'INE papá',
      'INE mamá'
    ]
  }
};

module.exports = { DOCUMENTOS_EJEMPLO };
