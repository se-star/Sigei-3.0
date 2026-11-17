-- ════════════════════════════════════════════════════════════════════════════
--  SIGEI TIC · Grados por sede
--  Cada grado guarda las sedes donde se ofrece. Una lista vacía significa que
--  se ofrece en todas las sedes (así quedan los grados que ya existen).
--  Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.grados add column if not exists sedes jsonb not null default '[]';

alter table public.grados drop constraint if exists grados_sedes_lista;
alter table public.grados add constraint grados_sedes_lista check (jsonb_typeof(sedes) = 'array');

-- Recarga el esquema de la API para que reconozca la columna nueva.
notify pgrst, 'reload schema';
