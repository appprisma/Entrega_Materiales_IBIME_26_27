# IBIME · Plataforma de Entrega y Recepción de Materiales

Plataforma web para los 7 planteles de IBIME que controla:

- **Entrega** de la escuela al padre/tutor: libros de texto, libretas y agenda.
- **Recepción** del padre/tutor a la escuela: papelería solicitada y artículos de IBIMEshop.
- **Documentación**: cotejo automático de qué documentos (acta, CURP, certificado, boleta,
  INE papá/mamá, comprobante de domicilio, etc.) ya entregó el alumno y cuáles faltan, con
  alerta visible en todo momento dentro de la pantalla de entrega.
- Verificación de **estatus de pago** por matrícula (≈3,500 alumnos) para decidir si la entrega
  procede ("**Entrega Aprobada**") o debe revisarse ("**Verificar Situación en Contraloría**").
- Panel de **Contraloría** para autorizar convenios/acuerdos (con la matrícula del contralor
  que autoriza), permitiendo que el alumno pase después a recolección.
- Panel de **Administración de catálogos** (`/admin`, con su propia contraseña) para dar de alta
  qué documentos y qué materiales corresponden a cada plantel/grado, y el inventario recibido.
- **Firma digital** del padre/tutor, una por cada tipo de movimiento (materiales entregados,
  papelería/IBIMEshop recibidos, documentación entregada), con la leyenda correspondiente.
- **Bitácora** de quién entregó/recibió cada movimiento (matrícula del empleado).
- **Inventario en tiempo real**: cuánto material se recibió por plantel y cuánto queda disponible,
  descontando automáticamente con cada entrega.
- **Corte de notificaciones por correo**: automático cada 30 minutos y también manual con un botón,
  avisando al padre/tutor lo que se le entregó/recibió, sin duplicar avisos ya enviados.
- **Dashboard** con entregas efectivas totales, del día, por plantel, con filtros y
  **exportación a Excel**.
- Acceso del personal con **matrícula de empleado + clave general** del ciclo escolar.

---

## 1. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + React Router |
| Estilos | CSS plano (sin frameworks pesados, carga rápida en tablets de los planteles) |
| Backend / datos | Firebase (Firestore + Storage + Hosting + Auth anónima + Cloud Functions) |
| Correo del corte | Cloud Functions + Nodemailer (SMTP) |
| Gráficas | Recharts |
| Importar/Exportar | PapaParse (CSV) + SheetJS/xlsx (Excel) |
| Firma digital | signature_pad |
| Control de versiones / CI-CD | GitHub + GitHub Actions → Firebase Hosting |

---

## 2. Estructura del proyecto

```
ibime-platform/
├─ src/
│  ├─ firebase/config.js         # Inicialización de Firebase (usa variables .env)
│  ├─ context/
│  │  ├─ AuthContext.jsx         # Login de personal por matrícula + clave general
│  │  └─ AdminContext.jsx        # Acceso al panel /admin por clave de administración
│  ├─ data/planteles.js          # Catálogo de los 7 planteles, estatus y tipos de movimiento
│  ├─ components/
│  │  ├─ Layout.jsx              # Barra de navegación según rol
│  │  ├─ EstadoBadge.jsx         # Etiqueta "Entrega Aprobada" / "Verificar..."
│  │  ├─ FirmaDigital.jsx        # Canvas de firma del padre/tutor
│  │  └─ EditorListaItems.jsx    # Lista editable reutilizable (panel Admin)
│  ├─ pages/
│  │  ├─ Login.jsx
│  │  ├─ BusquedaAlumno.jsx      # Buscar por matrícula
│  │  ├─ EntregaRecepcion.jsx    # 3 pestañas: Entrega / Recepción / Documentación
│  │  ├─ Contraloria.jsx         # Autorizar convenio/acuerdo
│  │  ├─ Dashboard.jsx           # KPIs, inventario, corte manual, gráfica, exportar
│  │  ├─ ImportarDatos.jsx       # Cargar CSV/Excel de alumnos y pagos (solo admin)
│  │  └─ admin/
│  │     ├─ AdminGate.jsx        # Formulario de la clave de administración
│  │     ├─ AdminLayout.jsx      # Navegación del panel /admin
│  │     ├─ AdminDocumentos.jsx  # Catálogo de documentos requeridos por grado
│  │     ├─ AdminMateriales.jsx  # Catálogo de libros/papelería/IBIMEshop por grado
│  │     └─ AdminInventario.jsx  # Captura de cantidades recibidas por plantel
│  ├─ styles/
│  │  └─ global.css
│  └─ utils/
│     ├─ exportExcel.js
│     ├─ importarArchivo.js
│     └─ inventario.js           # Descuento/consulta de inventario por plantel
├─ functions/                    # Cloud Functions: corte de notificaciones por correo
│  ├─ package.json
│  └─ index.js                   # corteAutomatico (cada 30 min) + ejecutarCorteManual
├─ firestore.rules               # Reglas de seguridad de la base de datos
├─ storage.rules                 # Reglas de seguridad de las firmas
├─ firestore.indexes.json        # Índices que requieren las consultas del dashboard/corte
├─ firebase.json                 # Configuración de Hosting/Firestore/Storage/Functions
├─ .github/workflows/deploy.yml  # Despliegue automático (Hosting + Functions + reglas)
└─ ejemplos/                     # CSV de ejemplo + scripts/formatos de referencia
```

El código está separado por responsabilidad (páginas, componentes, utilidades, datos,
Firebase) precisamente para que ajustes puntuales —por ejemplo cambiar la lista de
planteles, el texto de un estatus, o la lógica de exportación— se hagan en un solo
archivo pequeño sin tocar el resto de la app.

---

## 3. Modelo de datos en Firestore

### Colección `alumnos` (documento por matrícula, ID = matrícula)
```jsonc
{
  "nombre": "Ana Sofía Martínez López",
  "plantel": "plantel_1_lagos",
  "grado": "1",
  "grupo": "A",
  "nivel": "Primaria",
  "estatusPago": "al_corriente",       // "al_corriente" | "pendiente" | "convenio"
  "correoTutor": "papa.martinez@example.com", // usado por el corte de notificaciones
  "entregaRealizada": true,
  "entregaFecha": "<timestamp>",
  "entregaRegistradaPor": "E1001",
  "recepcionRealizada": false,
  "documentosEntregados": {             // se llena desde la pestaña "Documentación"
    "Acta de nacimiento": true,
    "CURP del alumno": true,
    "INE papá": false
  },
  "documentacionCompleta": false,       // true cuando todos los requeridos están en true
  "documentacionFecha": "<timestamp>",
  "documentacionRegistradaPor": "E1001",
  "convenioAutorizadoPor": "C2001",     // solo si estatusPago = "convenio"
  "convenioAutorizadoPorNombre": "Laura Contreras Díaz",
  "convenioNota": "Convenio a 3 meses, folio 1234",
  "convenioFecha": "<timestamp>"
}
```

### Colección `empleados` (documento por matrícula, ID = matrícula)
```jsonc
{
  "nombre": "Juana Pérez López",
  "plantel": "plantel_1_lagos",
  "rol": "entrega"   // "entrega" | "contraloria" | "admin"
}
```

### Colección `movimientos` (bitácora, un documento por acción — nunca se edita ni borra)
```jsonc
{
  "matricula": "24LAG0001",
  "nombreAlumno": "Ana Sofía Martínez López",
  "correoTutor": "papa.martinez@example.com",
  "plantel": "plantel_1_lagos",
  "tipo": "entrega_escuela_a_padre", // ver src/data/planteles.js > TIPO_MOVIMIENTO
  "leyenda": "El padre/tutor firmante declara haber RECIBIDO conforme...",
  "items": ["Español 1", "Matemáticas 1", "Libretas", "Agenda escolar"],
  "nombrePadreTutor": "Roberto Martínez",
  "firmaURL": "https://firebasestorage.../firmas/24LAG0001/entrega_....png",
  "empleadoMatricula": "E1001",
  "empleadoNombre": "Juana Pérez López",
  "fecha": "<timestamp>",
  "notificado": false,          // lo cambia a true el corte de notificaciones (ver sección 9)
  "correoEnviado": true,
  "correoEnviadoA": "papa.martinez@example.com",
  "notificadoEn": "<timestamp>"
}
```

Los tres tipos de movimiento posibles del día a día son `entrega_escuela_a_padre`,
`recepcion_padre_a_escuela` y `documentacion_entregada` (además de
`convenio_autorizado` e `importacion_pagos`, que registran otras acciones).

### Colección `materialesPorGrado` (documento por `${plantel}_${grado}`)
Se administra desde `/admin` → "Materiales por grado" (ya no hace falta cargarlo a mano en
Firebase Console). Define qué libros de texto, papelería e IBIMEshop corresponden a cada
grado de cada plantel; el checklist de las pestañas Entrega/Recepción se llena automáticamente
desde aquí. Ver `ejemplos/materiales_ejemplo.js` para el formato de referencia.

### Colección `documentosPorGrado` (documento por `${plantel}_${grado}`)
Se administra desde `/admin` → "Documentos por grado". Es la lista de documentos que debe
entregar cada alumno (acta de nacimiento, CURP, certificado, boleta, INE papá/mamá,
comprobante de domicilio, etc.), y contra la que se coteja automáticamente el checklist de la
pestaña "Documentación". Ver `ejemplos/documentos_ejemplo.js`.

### Colección `inventario` (documento por `${plantel}_${slug(material)}`)
Se administra desde `/admin` → "Inventario" (cantidad recibida) y se descuenta sola cuando se
confirma una entrega (cantidad entregada). Estructura:
```jsonc
{ "plantel": "plantel_1_lagos", "material": "Matemáticas 1", "recibido": 500, "entregado": 132 }
```

> Cuando te compartan la base real de alumnos y pagos, solo hace falta transformarla al
> formato de `ejemplos/alumnos_ejemplo.csv` y cargarla desde la pantalla **Importar datos**.
> Los catálogos de materiales, documentos e inventario ya no requieren tocar Firebase Console:
> se capturan directamente desde `/admin`.

---

## 4. Puesta en marcha local

### 4.1 Requisitos
- Node.js 20+
- Una cuenta de Firebase (gratis para empezar, plan Blaze si se rebasan los límites del
  plan gratuito con 3,500 alumnos y varios planteles consultando a la vez).

### 4.2 Crear el proyecto de Firebase
1. Ve a https://console.firebase.google.com → **Agregar proyecto** → nómbralo `ibime` (o similar).
2. Dentro del proyecto: **Compilación → Firestore Database → Crear base de datos** (modo producción).
3. **Compilación → Storage → Comenzar** (para las firmas digitales).
4. **Compilación → Authentication → Comenzar** → pestaña "Sign-in method" → habilita **Anónimo**
   (se usa solo para que las reglas de seguridad puedan validar que la escritura viene de la app,
   ver `firestore.rules`).
5. **Configuración del proyecto → Tus apps → Web (</>)** → registra la app y copia el objeto
   `firebaseConfig` que te da.

### 4.3 Configurar variables de entorno
```bash
cp .env.example .env
# Pega los valores de firebaseConfig en .env
```

### 4.4 Instalar y correr
```bash
npm install
npm run dev
```
Abre `http://localhost:5173`.

### 4.5 Dar de alta al primer empleado y probar
Antes de poder iniciar sesión necesitas al menos un documento en `empleados`. La forma
más rápida para probar es crearlo manualmente en Firebase Console → Firestore →
colección `empleados` → documento con ID = la matrícula, y campos `nombre`, `plantel`,
`rol`. Para altas masivas usa `ejemplos/sembrar_empleados.js`.

La clave de acceso para todo el personal es la que definas en `.env` como
`VITE_CLAVE_GENERAL_ENTREGA` (por defecto `ENTREGAIBIME2627`, tal como pediste).
La clave del panel `/admin` (catálogos de documentos, materiales e inventario) es
`VITE_CLAVE_ADMIN` (por defecto `IBIME-ADMIN-2627`) y es independiente del login de personal:
se entra directo en `/admin` sin necesidad de haber iniciado sesión como empleado.

---

## 5. Publicar reglas e índices en Firebase
```bash
npm install -g firebase-tools   # una sola vez
firebase login
firebase use --add              # selecciona tu proyecto de Firebase
firebase deploy --only firestore:rules,firestore:indexes,storage
```
Los índices también se crean automáticamente si Firestore te muestra un enlace de
"crear índice" la primera vez que corres una consulta del Dashboard; ese enlace hace
lo mismo que el archivo `firestore.indexes.json`.

---

## 6. Subir a GitHub y desplegar automáticamente

1. Crea un repositorio nuevo en GitHub (puede ser privado) y sube este proyecto:
   ```bash
   git init
   git add .
   git commit -m "IBIME: plataforma inicial de entrega y recepción"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/ibime-platform.git
   git push -u origin main
   ```
2. En Firebase Console: **Configuración del proyecto → Cuentas de servicio → Generar
   nueva clave privada** → descarga el JSON.
3. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**,
   crea estos secretos:
   - `FIREBASE_SERVICE_ACCOUNT` (pega el contenido completo del JSON del paso 2)
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
     `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
     `VITE_FIREBASE_APP_ID`, `VITE_CLAVE_GENERAL_ENTREGA` (los mismos valores de tu `.env`)
4. Cada `git push` a `main` compilará y publicará automáticamente en Firebase Hosting
   gracias a `.github/workflows/deploy.yml`.

También puedes desplegar manualmente en cualquier momento con:
```bash
npm run build
firebase deploy --only hosting
```

---

## 7. Formato de archivo para importar alumnos y pagos

Pantalla **Importar datos** (solo rol `admin`). Acepta `.csv` o `.xlsx` con estas
columnas (ver `ejemplos/alumnos_ejemplo.csv`):

| Columna | Descripción |
|---|---|
| `matricula` | Identificador único del alumno (se usa como ID del documento) |
| `nombre` | Nombre completo |
| `plantel` | Uno de los 7 IDs listados dentro de la propia pantalla de importación |
| `grado` | Ej. `1`, `2`, `3`… |
| `grupo` | Ej. `A`, `B`… |
| `nivel` | Ej. `Primaria`, `Secundaria`, `Bachillerato` |
| `estatusPago` | `al_corriente`, `pendiente` o `convenio` |

La importación es segura para repetirse: **actualiza** (merge) los datos generales y el
estatus de pago, pero **nunca borra** el historial de `entregaRealizada` /
`recepcionRealizada` de un alumno que ya recibió sus materiales.

---

## 8. Panel de Administración de catálogos (`/admin`)

Entra directo a `https://tu-dominio/admin` (o `http://localhost:5173/admin` en desarrollo) y
captura la clave `VITE_CLAVE_ADMIN`. No requiere haber iniciado sesión como empleado; es un
apartado aparte pensado para coordinación/sistemas. Tiene tres secciones:

1. **Documentos por grado** — elige plantel + grado y agrega/quita los documentos que ese
   grado debe entregar (acta de nacimiento, CURP, certificado, boleta, INE papá/mamá,
   comprobante de domicilio, etc.). Esto es lo que la pestaña "Documentación" de cada alumno
   coteja automáticamente.
2. **Materiales por grado** — elige plantel + grado y define tres listas: libros de texto
   (pestaña Entrega), papelería solicitada e IBIMEshop (pestaña Recepción). Libretas y Agenda
   escolar ya se agregan automáticamente a la pestaña de Entrega, no hace falta capturarlas aquí.
3. **Inventario** — elige plantel y captura cuántas piezas de cada libro/libreta/agenda
   llegaron físicamente. El sistema descuenta 1 automáticamente cada vez que ese material se
   entrega desde la pantalla de Entrega, así que el saldo "Disponible" siempre está al día.

Los cambios se guardan directo en Firestore y se reflejan de inmediato en la app del personal.

---

## 9. Corte de notificaciones por correo (evidencia para el padre/tutor)

Cada vez que se confirma una entrega, recepción o documentación, el movimiento se guarda con
`notificado: false`. El "corte" junta todos los movimientos con `notificado: false`, los agrupa
por alumno, envía **un correo por alumno** (con el detalle, la leyenda y el enlace a la firma) al
`correoTutor` capturado en la importación, y marca esos movimientos como `notificado: true` — así
el siguiente corte (automático o manual) nunca vuelve a avisar lo que ya se avisó.

- **Automático**: la función `corteAutomatico` corre sola cada 30 minutos (Cloud Scheduler),
  una vez desplegadas las Cloud Functions.
- **Manual**: el botón **"📧 Enviar corte ahora"** en el Dashboard llama a la función
  `ejecutarCorteManual` y hace exactamente lo mismo, al instante.

### Configurar el envío de correos (una sola vez, antes de desplegar)
```bash
cd functions
npm install
firebase functions:config:set \
  smtp.host="smtp.tu-proveedor.com" \
  smtp.port="587" \
  smtp.user="notificaciones@ibime.edu.mx" \
  smtp.pass="TU_CONTRASEÑA_O_APP_PASSWORD" \
  smtp.from="IBIME <notificaciones@ibime.edu.mx>"
```
Con Gmail se recomienda generar una "contraseña de aplicación" (no la contraseña normal de la
cuenta). También funciona con cualquier SMTP relay de proveedores como SendGrid, Mailgun,
Amazon SES, etc. — solo cambian `host`/`user`/`pass`.

### Desplegar las funciones
```bash
firebase deploy --only functions
```
El workflow de GitHub Actions (`.github/workflows/deploy.yml`) ya incluye este paso en cada
`git push` a `main`, usando el mismo `FIREBASE_SERVICE_ACCOUNT` que configuraste para Hosting.

> Si un alumno no tiene `correoTutor` capturado, el corte lo salta (no se queda reintentando
> para siempre) y lo deja visible para revisión manual; el Dashboard cuenta esos casos como
> "saltados" cuando usas el botón de corte manual.

---

## 10. Siguiente nivel de seguridad (recomendado antes de manejar datos reales)

La clave general cumple el requerimiento de "una sola contraseña para todo el
personal", y ya se combina con una sesión anónima de Firebase Auth para que las
reglas de Firestore exijan `request.auth != null` (ver comentarios en
`src/context/AuthContext.jsx` y `firestore.rules`). Aun así, para un control más fino
por rol directamente en el servidor, el siguiente paso recomendado es:

1. Mover la validación de matrícula + clave a una **Cloud Function** callable.
2. Que esa función devuelva un **Custom Token** de Firebase Auth con un **Custom
   Claim** `rol` (`entrega` / `contraloria` / `admin`) y `plantel`.
3. Cambiar `firestore.rules` para exigir, por ejemplo,
   `request.auth.token.rol == 'contraloria'` antes de autorizar un convenio.

Esto no cambia nada de la experiencia del personal (sigue siendo matrícula + clave),
solo mueve la verificación de roles del cliente al servidor. Puedo ayudarte a
implementarlo cuando quieras dar ese paso.

---

## 11. Pendientes para cuando tengas la base de datos real

- Confirmar el formato exacto (columnas/nombres) del archivo de alumnos + pagos, en particular
  que venga el **correo del padre/tutor** por alumno (columna `correoTutor`), indispensable para
  que el corte de notificaciones tenga a quién escribirle.
- Definir la lista real de empleados (matrícula, nombre, plantel, rol) para sembrar
  la colección `empleados` (ver `ejemplos/sembrar_empleados.js`).
- Capturar en `/admin` los catálogos reales de documentos requeridos, materiales por grado, e
  inventario recibido por plantel (o pasarme el archivo con esa información para cargarlo yo
  de una vez con un script, si prefieres no capturarlo a mano grado por grado).
- Definir con qué proveedor de correo (Gmail con contraseña de aplicación, SendGrid, etc.) se
  enviará el corte de notificaciones, para configurar `smtp.*` antes de desplegar `functions`.
- Decidir si "IBIMEshop" requiere manejo de inventario/existencias propio además del checklist
  de recepción (hoy el inventario automático solo aplica a libros/libretas/agenda de la pestaña
  de Entrega; si además quieres controlar stock de artículos IBIMEshop, es la misma mecánica de
  `src/utils/inventario.js` aplicada también a la pestaña de Recepción — lo puedo agregar).
