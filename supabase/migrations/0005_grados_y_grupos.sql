-- ═══════════════════════════════════════════════════════════════════════
--  SIGEI 3.0 · Grados y grupos
--  Ejecute este archivo completo en Supabase → SQL Editor → New query,
--  DESPUÉS de 0004_vinculacion_segura.sql.
--
--  - Cada institución elige el formato del nombre de sus grupos
--    (6°1, 601, 6A o 6-1) y las jornadas que maneja.
--  - Nueva jornada: fin de semana.
-- ═══════════════════════════════════════════════════════════════════════

begin;

alter table public.instituciones
  add column if not exists formato_grupo text not null default 'grado'
    check (formato_grupo in ('grado', 'numero', 'letra', 'guion'));

alter table public.instituciones
  add column if not exists jornadas text[] not null default array['manana', 'tarde'];

-- Las instituciones existentes conservan las jornadas que ya usan sus grupos.
update public.instituciones i
set jornadas = sub.usadas
from (
  select institucion_id, array_agg(distinct jornada order by jornada) as usadas
  from public.grupos group by institucion_id
) sub
where sub.institucion_id = i.id;

alter table public.grupos drop constraint if exists grupos_jornada_check;
alter table public.grupos add constraint grupos_jornada_check
  check (jornada in ('manana', 'tarde', 'unica', 'nocturna', 'fin_de_semana'));

alter table public.instituciones drop constraint if exists instituciones_jornadas_check;
alter table public.instituciones add constraint instituciones_jornadas_check
  check (jornadas <@ array['manana', 'tarde', 'unica', 'nocturna', 'fin_de_semana'] and cardinality(jornadas) > 0);

commit;
