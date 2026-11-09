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
| **Grados y grupos** | Estructura por nivel, director de grupo, jornada, sede y ocupación del aula. |
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

### Roles

| Rol | Alcance |
| --- | --- |
| Administrador | Todo, incluidos los usuarios y la configuración. |
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

Abra la dirección que aparece en la terminal y elija un rol. Sin credenciales de Supabase, SIGEI arranca en **modo demo**: carga datos ficticios y guarda los cambios **solo en ese navegador**. Puede restablecerlos en *Configuración → Respaldo*.

## Conectar Supabase (datos reales e inicio de sesión)

1. Cree un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **SQL Editor**, abra una consulta nueva, pegue todo el contenido de `supabase/migrations/0001_esquema_inicial.sql` y ejecútelo. Eso crea las tablas, las reglas de seguridad por rol y la auditoría.
3. En **Project Settings → API**, copie la *Project URL* y la *anon public key*.
4. Copie `.env.example` como `.env.local` y complete:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Ejecute `npm run dev` y use **Solicitar acceso** para crear su cuenta.
   - **La primera cuenta registrada queda como Administrador activo.**
   - Las siguientes quedan pendientes hasta que un administrador las active en *Usuarios y roles*.
6. Opcional: para empezar con datos, descargue un respaldo desde el modo demo y restáurelo en *Configuración → Respaldo*.

> En **Authentication → URL Configuration** ponga como *Site URL* la dirección publicada (por ejemplo `https://se-star.github.io/Sigei-3.0/`) y agréguela también en *Redirect URLs*, junto con `http://localhost:5173/` si va a trabajar en local. Así funcionan los correos de confirmación y de recuperación de contraseña. Quien llega desde el enlace de recuperación ve una pantalla para crear su contraseña nueva; con sesión iniciada también se puede cambiar desde *Mi perfil*.

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
