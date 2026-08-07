/**
 * Cloud Functions de IBIME.
 *
 * "Corte de notificaciones": junta los movimientos (entregas, recepciones,
 * documentación) que aún no se han avisado por correo al padre/tutor
 * (notificado == false), agrupa por alumno, envía UN correo por alumno con el
 * resumen + la leyenda + el enlace a la firma, y marca esos movimientos como
 * notificado: true para que el siguiente corte (automático o manual) no los
 * vuelva a enviar.
 *
 * - corteAutomatico: se ejecuta sola cada 30 minutos (Cloud Scheduler).
 * - ejecutarCorteManual: la llama el botón "Enviar corte ahora" del Dashboard.
 *
 * CONFIGURACIÓN REQUERIDA antes de desplegar (una sola vez):
 *   firebase functions:config:set \
 *     smtp.host="smtp.tu-proveedor.com" \
 *     smtp.port="587" \
 *     smtp.user="notificaciones@ibime.edu.mx" \
 *     smtp.pass="TU_CONTRASEÑA_O_APP_PASSWORD" \
 *     smtp.from="IBIME <notificaciones@ibime.edu.mx>"
 *
 * Con Gmail se recomienda una "contraseña de aplicación"; con proveedores
 * como SendGrid/Mailgun se usa su SMTP relay igual, solo cambian host/usuario.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

const TAMANO_LOTE_CORTE = 400; // máximo de movimientos que procesa cada corte

function crearTransporte() {
  const cfg = functions.config().smtp || {};
  if (!cfg.host || !cfg.user || !cfg.pass) {
    throw new Error(
      'Falta configurar smtp.host / smtp.user / smtp.pass con "firebase functions:config:set" (ver comentario al inicio de functions/index.js).'
    );
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: Number(cfg.port) || 587,
    secure: Number(cfg.port) === 465,
    auth: { user: cfg.user, pass: cfg.pass }
  });
}

const ETIQUETA_TIPO = {
  entrega_escuela_a_padre: 'Entrega de materiales y libros',
  recepcion_padre_a_escuela: 'Recepción de papelería / IBIMEshop',
  documentacion_entregada: 'Entrega de documentación'
};

function armarHtmlCorreo(nombreAlumno, matricula, movimientos) {
  const bloques = movimientos
    .map((m) => {
      const fecha = m.fecha && m.fecha.toDate ? m.fecha.toDate().toLocaleString('es-MX') : '';
      const items = (m.items || []).map((i) => `<li>${escaparHtml(i)}</li>`).join('');
      return `
        <div style="margin-bottom:18px;padding:14px;border:1px solid #e2e6ef;border-radius:8px;">
          <p style="margin:0 0 6px;font-weight:700;color:#12203b;">${ETIQUETA_TIPO[m.tipo] || m.tipo}</p>
          <p style="margin:0 0 6px;color:#5b6478;font-size:13px;">${fecha}</p>
          <ul style="margin:0 0 8px;padding-left:18px;">${items}</ul>
          <p style="margin:0;font-size:13px;color:#1c2434;"><em>${escaparHtml(m.leyenda || '')}</em></p>
          <p style="margin:6px 0 0;font-size:13px;">Firmado por: ${escaparHtml(m.nombrePadreTutor || '')}</p>
          ${m.firmaURL ? `<p style="margin:4px 0 0;font-size:13px;"><a href="${m.firmaURL}">Ver firma digital</a></p>` : ''}
        </div>`;
    })
    .join('');

  return `
    <div style="font-family:Segoe UI, Arial, sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#12203b;">IBIME · Aviso de entrega y recepción</h2>
      <p>Se informa que se registraron los siguientes movimientos para el alumno <strong>${escaparHtml(nombreAlumno)}</strong> (matrícula ${escaparHtml(matricula)}):</p>
      ${bloques}
      <p style="font-size:12px;color:#5b6478;margin-top:20px;">
        Este correo es evidencia automática de los movimientos registrados en la plataforma IBIME.
        Si algún dato no corresponde con lo entregado o recibido, favor de comunicarse con el plantel
        dentro de las siguientes 24 horas.
      </p>
    </div>`;
}

function escaparHtml(texto) {
  return String(texto || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function procesarCorte() {
  const snap = await db
    .collection('movimientos')
    .where('notificado', '==', false)
    .orderBy('fecha', 'asc')
    .limit(TAMANO_LOTE_CORTE)
    .get();

  if (snap.empty) return { enviados: 0, saltados: 0 };

  const porAlumno = {};
  snap.docs.forEach((d) => {
    const datos = { id: d.id, ref: d.ref, ...d.data() };
    if (!porAlumno[datos.matricula]) porAlumno[datos.matricula] = [];
    porAlumno[datos.matricula].push(datos);
  });

  const transporte = crearTransporte();
  const remitente = (functions.config().smtp || {}).from || (functions.config().smtp || {}).user;

  let enviados = 0;
  let saltados = 0;

  for (const matricula of Object.keys(porAlumno)) {
    const movs = porAlumno[matricula];
    const correo = movs.find((m) => m.correoTutor)?.correoTutor;
    const nombreAlumno = movs[0].nombreAlumno || matricula;

    if (!correo) {
      // Sin correo de contacto: se marca como procesado (con correoEnviado:false)
      // para no intentarlo en cada corte por siempre; queda visible para revisión manual.
      const batchSinCorreo = db.batch();
      movs.forEach((m) => batchSinCorreo.update(m.ref, {
        notificado: true,
        correoEnviado: false,
        notificadoEn: admin.firestore.FieldValue.serverTimestamp()
      }));
      await batchSinCorreo.commit();
      saltados += 1;
      continue;
    }

    try {
      await transporte.sendMail({
        from: remitente,
        to: correo,
        subject: `IBIME · Aviso de entrega/recepción — ${nombreAlumno}`,
        html: armarHtmlCorreo(nombreAlumno, matricula, movs)
      });

      const batchOk = db.batch();
      movs.forEach((m) => batchOk.update(m.ref, {
        notificado: true,
        correoEnviado: true,
        correoEnviadoA: correo,
        notificadoEn: admin.firestore.FieldValue.serverTimestamp()
      }));
      await batchOk.commit();
      enviados += 1;
    } catch (err) {
      // Si falla el envío, se deja notificado:false para reintentar en el siguiente corte.
      functions.logger.error(`Error enviando corte a ${correo} (matrícula ${matricula}):`, err);
    }
  }

  return { enviados, saltados };
}

// Corte automático cada 30 minutos.
exports.corteAutomatico = functions.pubsub.schedule('every 30 minutes').onRun(async () => {
  const resultado = await procesarCorte();
  functions.logger.info('Corte automático ejecutado:', resultado);
  return null;
});

// Corte manual: lo llama el botón "Enviar corte ahora" del Dashboard.
exports.ejecutarCorteManual = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión en la plataforma para ejecutar el corte.');
  }
  return await procesarCorte();
});
