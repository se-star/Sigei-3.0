# SIGEI 3.0

**Sistema de Gestión Educativa Institucional.** Una plataforma web para organizar el día a día de un colegio: docentes, grupos, asignación académica, horarios, novedades del personal, seguimiento pedagógico, calendario y comunicación institucional.

Esta versión se construyó desde cero, con modo oscuro y uso cómodo desde el celular.

**Diseño:** lienzo gris claro con tarjetas blancas que flotan sobre sombras suaves (radio de 28 px), controles en píldora, tipografía Inter con tracking negativo y sin negritas pesadas, acción primaria en negro y un único acento violeta (`#5433eb`) reservado al logotipo y a la búsqueda. Los tokens están en `src/index.css`.

---

## Módulos

| Módulo | Qué permite hacer |
| --- | --- |
| **Inicio** | Resumen del día: ausencias con su reemplazo, próximos eventos, comunicados, tareas, cumpleaños y carga académica por área. Cada docente ve además sus clases del día. |
| **Docentes** | Directorio en tabla o tarjetas, filtros, exportación y hoja de vida con pestañas: carga, horario, novedades y seguimiento. |
| **Grados y grupos** | Grados del catálogo colombiano (Prejardín a Undécimo) que se agregan varios a la vez; grupos con nombre propuesto según el formato de cada institución (6°1, 601, 6A o 6-1), jornadas propias de cada institución, director de grupo, sede y ocupación del aula. El director de grupo tiene **Mi grupo**: horario, docentes con sus datos de contacto y plan de estudios. |
| **Asignación académica** | Carga por docente o plan de estudios por grupo. Asigna una materia a varios grupos a la vez, avisa si se supera la carga máxima y compara las horas asignadas con las programadas. |
| **Horarios** | Cuadrícula semanal por grupo o por docente. **Detecta choques** de docente, grupo y aula mientras se programa, propone el docente de la asignación y permite imprimir. |
| **Novedades y permisos** | El docente radica su solicitud y la coordinación o la rectoría la aprueba o la rechaza. SIGEI calcula las clases afectadas y **ordena los posibles reemplazos por disponibilidad**. |
| **Seguimiento pedagógico** | Visitas de aula con rúbrica de 1 a 4 (criterios configurables), fortalezas, compromisos, promedios por criterio y cobertura del acompañamiento. |
| **Calendario** | Vista mensual con filtros por tipo de evento y **exportación .ics** para Google Calendar u Outlook. |
| **Comunicados** | Avisos con prioridad, audiencia y opción de fijarlos arriba. |
| **Tareas** | Tablero tipo kanban que se ordena arrastrando las tarjetas, con responsable, prioridad y fecha límite. |
| **Reportes** | Indicadores (ausencias por mes y por tipo, vinculación, ocupación) y exportaciones a Excel (CSV). |
| **Usuarios y roles** | Activación de cuentas, asignación de rol, vínculo con el registro docente y matriz de permisos. |
| **Sedes · Actividad · Configuración** | Sedes, registro de auditoría (quién cambió qué y cuándo), datos de la institución, áreas y asignaturas, franjas horarias, rúbrica, y respaldo o restauración en JSON. |

También incluye:

- **Búsqueda rápida** con `Ctrl + K`.
- **Centro de notificaciones**: solicitudes por aprobar, eventos de hoy y mañana, comunicados nuevos, cumpleaños y tareas vencidas.
- **Tema claro, oscuro o automático.**

### Varias instituciones

SIGEI es una plataforma compartida: varias instituciones educativas trabajan en el mismo sitio y la misma base de datos, y cada una ve **solo sus propios datos**.

- **Superadministrador** (la primera cuenta de la plataforma): crea instituciones, nombra a sus administradores, ve indicadores de todas y puede entrar a cualquiera desde *Instituciones*.
- **Una persona, varias instituciones**: una sola cuenta puede tener un rol distinto en cada institución (por ejemplo, coordinación en una y docente en otra). Se cambia de institución desde el selector bajo el logotipo.
- **Acceso**: al registrarse, la persona elige su institución y queda pendiente hasta que el administrador de esa institución la active. Desde *Mi perfil* puede pedir acceso a otras.
- La separación se aplica en la base de datos: las políticas RLS impiden leer o escribir datos de otra institución, e incluso relacionar registros entre instituciones.

### Espacio del docente

Cada docente tiene su cuenta en SIGEI y entra con su **número de documento**: recibe un código de 6 dígitos en el correo que la institución registró y con él ingresa, sin contraseña. Su cuenta queda vinculada sola con su registro (en todas las instituciones donde esté registrado con ese correo).

- **Inicio**: próxima clase, clases del día, sus solicitudes, actividades del mes, comunicados y tareas.
- **Mi horario**: su semana de clases, imprimible y exportable al calendario del celular (.ics).
- **Mis permisos**: solicitudes con soportes adjuntos (PDF o foto, hasta 5 MB, privados).
- **Actividades**, **Comunicados**, **Mi seguimiento** (lo socializado con él) y **Tareas**.

### Roles (dentro de cada institución)

| Rol | Alcance |
| --- | --- |
| Administrador | Todo en su institución, incluidos los usuarios y la configuración. |
| Rectoría | Gestión institucional, aprobaciones, sedes, configuración y actividad. |
| Coordinación | Docentes, grupos, horarios, novedades, seguimiento, calendario y comunicados. |
| Docente | Consulta, su propio horario, radicación de sus novedades y tareas. |

Los permisos se aplican tanto en la interfaz (`src/lib/permisos.ts`) como en la base de datos, mediante políticas RLS de PostgreSQL. Por eso un docente no puede, por ejemplo, aprobar sus propios permisos aunque manipule la aplicación.

---

## Probar en modo demo (sin configurar nada)

Requisito: Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abra la dirección que aparece en la terminal y elija un rol. El modo demo trae dos colegios de ejemplo: el superadministrador ve ambos, y la coordinadora y la docente de ejemplo trabajan en los dos. Sin credenciales de Supabase, SIGEI arranca en **modo demo**: carga datos ficticios y guarda los cambios **solo en ese navegador**. Puede restablecerlos en *Configuración → Respaldo*.

## Conectar Supabase (datos reales e inicio de sesión)

1. Cree un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **SQL Editor** ejecute, en orden y cada uno en una consulta nueva, los archivos de `supabase/migrations/`:
   1. `0001_esquema_inicial.sql`: tablas, seguridad y auditoría.
   2. `0002_multiples_instituciones.sql`: varias instituciones en la misma plataforma. Si su proyecto ya tenía datos, la institución existente pasa a ser la primera y no se pierde nada.
3. En **Project Settings → API**, copie la *Project URL* y la *anon public key*.
4. Copie `.env.example` como `.env.local` y complete:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Ejecute `npm run dev` y use **Solicitar acceso** para crear su cuenta.
   - **La primera cuenta registrada queda como superadministrador** de la plataforma.
   - Las siguientes eligen su institución al registrarse y quedan pendientes hasta que el administrador de esa institución las active en *Usuarios y roles*.
6. Opcional: para empezar con datos, descargue un respaldo desde el modo demo y cárguelo en *Configuración → Respaldo*. Los registros se copian con identificadores nuevos, así que el mismo respaldo sirve para varias instituciones.

#### Ingreso de docentes

Ejecute también `supabase/migrations/0003_acceso_docentes.sql` (vinculación y soportes), `0004_vinculacion_segura.sql` y `0005_grados_y_grupos.sql` (formato de nombres y jornadas por institución).

**Mientras no se active el código por correo**, los docentes entran con correo y contraseña: usan *Solicitar acceso* con el mismo correo que tienen en *Docentes*, su cuenta queda vinculada sola a su registro y coordinación solo debe activarla en *Usuarios y roles* (la columna *Acceso a SIGEI* muestra quién está *Por activar*). Una cuenta solo se activa sola si su correo está comprobado (ingreso con código o confirmación por enlace).

**Para activar el ingreso con documento y código:**

1. Las migraciones anteriores ya deben estar ejecutadas.
2. **Función del servidor**: en **Edge Functions → Deploy a new function → Via Editor**, nómbrela `acceso-docente`, pegue el contenido de `supabase/functions/acceso-docente/index.ts`, despliéguela y, en su configuración, **desactive "Verify JWT"** (la usan personas que aún no han ingresado).
3. **Correo propio** (obligatorio para que los códigos lleguen a todos los docentes): en **Authentication → Emails → SMTP Settings** configure un servicio como Gmail (con contraseña de aplicación) o Resend.
4. **Plantillas**: en **Authentication → Emails**, pegue las plantillas con la marca de `supabase/plantillas/`: `magic-link.html` en *Magic Link* (asunto «Su código para ingresar a SIGEI TIC»), `confirm-signup.html` en *Confirm signup* («Bienvenido a SIGEI TIC») y `reset-password.html` en *Reset Password* («Restablecer su contraseña de SIGEI TIC»).
5. En GitHub, **Settings → Secrets and variables → Actions → Variables**, cree la variable `VITE_ACCESO_DOCENTE` con el valor `1` y vuelva a publicar. Aparecerá la pestaña *Soy docente* en el ingreso.
6. Registre a cada docente en *Docentes* con su documento y su correo.

> En **Authentication → URL Configuration** ponga como *Site URL* la dirección publicada (por ejemplo `https://se-star.github.io/Sigei-3.0/`) y agréguela también en *Redirect URLs*, junto con `http://localhost:5173/` si va a trabajar en local. Así funcionan los correos de confirmación y de recuperación de contraseña. Quien llega desde el enlace de recuperación ve una pantalla para crear su contraseña nueva; con sesión iniciada también se puede cambiar desde *Mi perfil*.

## Marca

Los archivos oficiales del logo de SIGEI TIC están en `public/marca/` y se publican en `https://se-star.github.io/Sigei-3.0/marca/`. Las letras están convertidas en trazos, así que los SVG se ven igual en cualquier equipo.

| Archivo | Uso |
|---|---|
| `logo-vertical*.svg` | Versión principal: portadas, ingreso, afiches y certificados |
| `logo-horizontal*.svg` | Menú, encabezados de documentos y correos |
| `logo-horizontal-frase*.svg` | Horizontal con «Gestión educativa institucional» |
| `simbolo*.svg` | El hexágono solo |
| `icono-app.svg`, `icono-app-maskable.svg` | Ícono de la app sobre azul marino |
| `png/` | Las mismas versiones en PNG con fondo transparente |

Cada versión viene en cuatro tonos: a color para fondos claros (sin sufijo), `-oscuro` para fondos azul marino, y `-blanco` y `-grafito` a una sola tinta. Los íconos de la app están en `public/icons/`, el favicon en `public/favicon.svg` y `public/favicon.ico`, y la imagen para compartir el enlace en `public/og-image.png`.

## Publicar en GitHub Pages

El flujo `.github/workflows/deploy.yml` compila y publica el sitio cada vez que hay cambios en `main`.

1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. En **Settings → Secrets and variables → Actions**, cree `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Si no los crea, el sitio se publica en modo demo.

La clave *anon* de Supabase es pública por diseño. La seguridad la dan las políticas RLS del esquema.

---

## Desarrollo

```bash
npm run dev        # servidor local
npm test           # pruebas unitarias (horarios, fechas, permisos)
npm run typecheck  # verificación de tipos
npm run build      # compilación para producción (carpeta dist/)
```

**Tecnología:** React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router, Supabase (PostgreSQL + Auth) y Lucide para los iconos.

```
src/
  pages/              una pantalla por módulo
  components/ui/      botones, campos, modales, tablas, insignias…
  components/layout/  menú lateral, barra superior, paleta Ctrl+K
  hooks/              datos (useTabla / useMutar), sesión, notificaciones, tema
  lib/data/           proveedores de datos: Supabase y modo demo local
  lib/permisos.ts     matriz de permisos por rol
  lib/utils.ts        fechas, detección de choques, exportación
supabase/migrations/  esquema SQL, RLS y auditoría
```

La aplicación accede a los datos solo a través de la interfaz `DataProvider` (`src/lib/data/provider.ts`). Esa capa permite que el modo demo y Supabase se comporten igual y facilitaría cambiar de base de datos en el futuro.
