// Catálogo de los 7 planteles IBIME.
// El "id" es el valor que se guarda en Firestore; no cambiar una vez que haya datos cargados.
export const PLANTELES = [
  { id: 'plantel_1_lagos', numero: 1, nombre: 'Lagos' },
  { id: 'plantel_2_montes_primaria', numero: 2, nombre: 'Montes Primaria' },
  { id: 'plantel_3_montes_secundaria', numero: 3, nombre: 'Montes Secundaria' },
  { id: 'plantel_4_montes_bachillerato', numero: 4, nombre: 'Montes Bachillerato' },
  { id: 'plantel_5_san_cristobal', numero: 5, nombre: 'San Cristóbal' },
  { id: 'plantel_6_coacalco', numero: 6, nombre: 'Coacalco A' },
  { id: 'plantel_7_coacalco', numero: 7, nombre: 'Coacalco B' }
];

export function nombrePlantel(id) {
  const p = PLANTELES.find((x) => x.id === id);
  return p ? `Plantel ${p.numero} - ${p.nombre}` : id || 'Sin plantel';
}

// Estatus posibles de pago / entrega de un alumno.
export const ESTATUS = {
  AL_CORRIENTE: 'al_corriente',
  PENDIENTE: 'pendiente',
  CONVENIO: 'convenio'
};

export const ESTATUS_LABEL = {
  [ESTATUS.AL_CORRIENTE]: 'Entrega Aprobada',
  [ESTATUS.PENDIENTE]: 'Verificar Situación en Contraloría',
  [ESTATUS.CONVENIO]: 'Convenio o Acuerdo - Entrega Aprobada'
};

// Tipos de movimiento registrados en la bitácora (colección "movimientos").
export const TIPO_MOVIMIENTO = {
  ENTREGA_ESCUELA_A_PADRE: 'entrega_escuela_a_padre', // libros, libretas, agenda
  RECEPCION_PADRE_A_ESCUELA: 'recepcion_padre_a_escuela', // papelería / IBIMEshop
  DOCUMENTACION_ENTREGADA: 'documentacion_entregada', // acta, CURP, INE, etc.
  CONVENIO_AUTORIZADO: 'convenio_autorizado',
  IMPORTACION_PAGOS: 'importacion_pagos'
};

// Leyenda que se guarda junto con la firma de cada movimiento, y que también
// se usa en el cuerpo del correo del "corte" de notificaciones.
export const LEYENDA_MOVIMIENTO = {
  [TIPO_MOVIMIENTO.ENTREGA_ESCUELA_A_PADRE]:
    'El padre/tutor firmante declara haber RECIBIDO conforme los materiales y libros arriba señalados.',
  [TIPO_MOVIMIENTO.RECEPCION_PADRE_A_ESCUELA]:
    'El padre/tutor firmante declara haber ENTREGADO la papelería y/o los artículos de IBIMEshop arriba señalados.',
  [TIPO_MOVIMIENTO.DOCUMENTACION_ENTREGADA]:
    'El padre/tutor firmante declara haber ENTREGADO la documentación requerida arriba señalada.'
};

export function etiquetaTipoMovimiento(tipo) {
  const mapa = {
    [TIPO_MOVIMIENTO.ENTREGA_ESCUELA_A_PADRE]: 'Entrega (escuela → padre)',
    [TIPO_MOVIMIENTO.RECEPCION_PADRE_A_ESCUELA]: 'Recepción (padre → escuela)',
    [TIPO_MOVIMIENTO.DOCUMENTACION_ENTREGADA]: 'Documentación entregada',
    [TIPO_MOVIMIENTO.CONVENIO_AUTORIZADO]: 'Convenio autorizado',
    [TIPO_MOVIMIENTO.IMPORTACION_PAGOS]: 'Importación de pagos'
  };
  return mapa[tipo] || tipo;
}

// Convierte un nombre de material/documento en un ID seguro para Firestore
// (sin espacios, acentos ni caracteres especiales). Se usa para las llaves
// de inventario, para que "Español 1" y " español   1 " sean el mismo ítem.
export function slugItem(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
