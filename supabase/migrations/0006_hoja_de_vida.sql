-- ════════════════════════════════════════════════════════════════════════════
--  SIGEI TIC · Hoja de vida del docente
--  Agrega a cada docente su formación, su experiencia y los documentos de su
--  hoja de vida (títulos, acto de nombramiento, certificados). Los archivos se
--  guardan en el mismo espacio privado de soportes, en la carpeta de la
--  institución y del docente, así que las reglas de acceso ya existentes
--  aplican: los ven los directivos de la institución y el propio docente.
--  Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.docentes add column if not exists formacion jsonb not null default '[]';
alter table public.docentes add column if not exists experiencia jsonb not null default '[]';
alter table public.docentes add column if not exists documentos jsonb not null default '[]';

-- Cada campo debe ser una lista.
alter table public.docentes drop constraint if exists docentes_formacion_lista;
alter table public.docentes add constraint docentes_formacion_lista check (jsonb_typeof(formacion) = 'array');
alter table public.docentes drop constraint if exists docentes_experiencia_lista;
alter table public.docentes add constraint docentes_experiencia_lista check (jsonb_typeof(experiencia) = 'array');
alter table public.docentes drop constraint if exists docentes_documentos_lista;
alter table public.docentes add constraint docentes_documentos_lista check (jsonb_typeof(documentos) = 'array');

-- Recarga el esquema de la API para que reconozca las columnas nuevas.
notify pgrst, 'reload schema';
