-- ═══════════════════════════════════════════════════════════════════════════
--  SIGEI 3.0 · Protección de datos personales (Ley 1581 de 2012)
--  Ejecute DESPUÉS de 0010_permisos_firma_soportes.sql. Se puede ejecutar más
--  de una vez sin problema.
--
--  1. Datos de contacto de la institución para la política de privacidad:
--     dirección, teléfono y correo para consultas y reclamos sobre datos.
--  2. Registro de aceptación de los términos y la política de tratamiento:
--     quién aceptó, qué versión y cuándo (prueba de la autorización, art. 9
--     Ley 1581 y Decreto 1074 de 2015, art. 2.2.2.25.2.5).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Contacto de la institución ────────────────────────────────────────
alter table public.instituciones add column if not exists direccion    text not null default '';
alter table public.instituciones add column if not exists telefono     text not null default '';
alter table public.instituciones add column if not exists correo_datos text not null default '';

-- ── 2. Aceptaciones de la política ───────────────────────────────────────
create table if not exists public.consentimientos (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users (id) on delete cascade,
  version      text not null check (length(version) between 1 and 40),
  aceptado_en  timestamptz not null default now(),
  -- Navegador desde el que aceptó (sin IP): ayuda a probar la aceptación.
  agente       text not null default '' check (length(agente) <= 400)
);
create index if not exists consentimientos_usuario_idx on public.consentimientos (usuario_id, aceptado_en desc);

alter table public.consentimientos enable row level security;

-- Cada persona ve sus aceptaciones; el superadministrador, todas.
drop policy if exists "ver propias" on public.consentimientos;
create policy "ver propias" on public.consentimientos for select to authenticated
  using (usuario_id = auth.uid() or public.es_superadmin());
-- Nadie inserta, cambia ni borra directamente: solo con aceptar_politicas().
revoke all on public.consentimientos from anon;
revoke insert, update, delete on public.consentimientos from authenticated;
grant select on public.consentimientos to authenticated;

create or replace function public.aceptar_politicas(version text, agente text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Inicie sesión para aceptar la política.' using errcode = '42501';
  end if;
  insert into public.consentimientos (usuario_id, version, agente)
  values (auth.uid(), left(coalesce(version, ''), 40), left(coalesce(agente, ''), 400));
end $$;

revoke all on function public.aceptar_politicas(text, text) from public, anon;
grant execute on function public.aceptar_politicas(text, text) to authenticated;
