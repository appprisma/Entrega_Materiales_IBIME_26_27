import * as XLSX from 'xlsx';

// Recibe un arreglo de objetos planos y descarga un .xlsx
export function exportarAExcel(filas, nombreArchivo = 'reporte_ibime') {
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `${nombreArchivo}_${fecha}.xlsx`);
}
