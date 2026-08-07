import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Devuelve un arreglo de objetos { matricula, nombre, plantel, grado, grupo, nivel, estatusPago }
// a partir de un archivo .csv o .xlsx. Las columnas del archivo deben llamarse
// exactamente igual a las llaves esperadas (ver README > "Formato de archivos de importación").
export function leerArchivo(file) {
  const esCSV = file.name.toLowerCase().endsWith('.csv');

  return new Promise((resolve, reject) => {
    if (esCSV) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(normalizarFilas(res.data)),
        error: reject
      });
    } else {
      const lector = new FileReader();
      lector.onload = (e) => {
        try {
          const libro = XLSX.read(e.target.result, { type: 'array' });
          const hoja = libro.Sheets[libro.SheetNames[0]];
          const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });
          resolve(normalizarFilas(filas));
        } catch (err) {
          reject(err);
        }
      };
      lector.onerror = reject;
      lector.readAsArrayBuffer(file);
    }
  });
}

function normalizarFilas(filas) {
  return filas
    .map((f) => ({
      matricula: String(f.matricula || f.Matricula || '').trim().toUpperCase(),
      nombre: String(f.nombre || f.Nombre || '').trim(),
      plantel: String(f.plantel || f.Plantel || '').trim(),
      grado: String(f.grado || f.Grado || '').trim(),
      grupo: String(f.grupo || f.Grupo || '').trim(),
      nivel: String(f.nivel || f.Nivel || '').trim(),
      estatusPago: normalizarEstatus(f.estatusPago || f.EstatusPago || f.estatus_pago),
      // Correo del padre/tutor: se usa para el "corte" de notificaciones por correo.
      correoTutor: String(f.correoTutor || f.CorreoTutor || f.correo || f.Correo || '').trim().toLowerCase()
    }))
    .filter((f) => f.matricula);
}

function normalizarEstatus(valor) {
  const v = String(valor || '').trim().toLowerCase();
  if (['al_corriente', 'al corriente', 'pagado', 'ok', '1'].includes(v)) return 'al_corriente';
  if (['pendiente', 'adeudo', 'moroso', '0'].includes(v)) return 'pendiente';
  if (['convenio', 'acuerdo'].includes(v)) return 'convenio';
  return 'pendiente'; // por seguridad: si no se reconoce, se marca pendiente para revisión manual
}
