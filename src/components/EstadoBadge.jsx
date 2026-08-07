import { ESTATUS, ESTATUS_LABEL } from '../data/planteles';

// Muestra el estatus del alumno con el texto EXACTO solicitado:
// "Entrega Aprobada" / "Verificar Situación en Contraloría" / convenio.
export default function EstadoBadge({ estatus }) {
  const clase =
    estatus === ESTATUS.PENDIENTE
      ? 'badge badge-alerta'
      : estatus === ESTATUS.CONVENIO
      ? 'badge badge-convenio'
      : 'badge badge-ok';

  return <span className={clase}>{ESTATUS_LABEL[estatus] || 'Sin estatus de pago'}</span>;
}
