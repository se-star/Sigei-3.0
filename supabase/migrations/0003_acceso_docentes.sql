-- ═══════════════════════════════════════════════════════════════════════
--  SIGEI 3.0 · Acceso de docentes y soportes de permisos
--  Ejecute este archivo completo en Supabase → SQL Editor → New query,
--  DESPUÉS de 0002_multiples_instituciones.sql.
--
--  - Un docente registrado en el directorio con su correo queda vinculado a su
--    cuenta automáticamente (en cada institución donde esté registrado) en
--    cuanto demuestra que el correo es suyo (código enviado por correo).
--  - Los permisos pueden llevar soportes adjuntos (PDF o imagen) en un espacio
--    privado de Supabase Storage.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Vinculación automática docente ↔ cuenta ────────────────────────────

-- Crea o activa la membresía de docente del usuario en cada institución donde
-- exista un docente con su correo. No reduce roles: si ya era coordinador, sigue
-- siéndolo; solo completa el docente vinculado si faltaba.
create or replace function public.vincular_docente_usuario(uid uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  correo text;
  d      record;
  n      int := 0;
begin
  select lower(u.email) into correo
  from auth.users u
  where u.id = uid and u.email_confirmed_at is not null;
  if correo is null or correo = '' then return 0; end if;

  for d in
    select doc.id, doc.institucion_id, doc.nombres, doc.apellidos
    from public.docentes doc
    join public.instituciones i on i.id = doc.institucion_id and i.activa
    where lower(trim(doc.email)) = correo and doc.estado <> 'retirado'
  loop
    insert into public.membresias (usuario_id, institucion_id, rol, docente_id, activo)
    values (uid, d.institucion_id, 'docente', d.id, true)
    on conflict (usuario_id, institucion_id) do update
      set activo = true,
          docente_id = coalesce(public.membresias.docente_id, excluded.docente_id);
    n := n + 1;
    -- Nombre del perfil: si aún es el que se dedujo del correo, se toma el del directorio.
    update public.perfiles
      set nombre = trim(d.nombres || ' ' || d.apellidos)
      where id = uid and (nombre = '' or nombre = split_part(correo, '@', 1));
  end loop;
  return n;
end $$;

-- La app la llama al iniciar sesión.
create or replace function public.vincular_mis_docentes()
returns int language sql security definer set search_path = public as $$
  select public.vincular_docente_usuario(auth.uid())
$$;
grant execute on function public.vincular_mis_docentes() to authenticated;
revoke execute on function public.vincular_docente_usuario(uuid) from public, anon, authenticated;

-- Si la institución registra (o corrige) el correo de un docente que ya tiene cuenta,
-- se vincula de inmediato.
create or replace function public.vincular_al_guardar_docente()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if coalesce(trim(new.email), '') = '' or new.estado = 'retirado' then return new; end if;
  if tg_op = 'UPDATE' and lower(coalesce(old.email, '')) = lower(new.email) and old.estado = new.estado then return new; end if;
  select u.id into uid from auth.users u
  where lower(u.email) = lower(trim(new.email)) and u.email_confirmed_at is not null;
  if uid is not null then perform public.vincular_docente_usuario(uid); end if;
  return new;
end $$;

drop trigger if exists vincular_cuenta on public.docentes;
create trigger vincular_cuenta after insert or update of email, estado on public.docentes
  for each row execute function public.vincular_al_guardar_docente();

-- El documento se guarda sin puntos ni espacios para poder ingresar con él.
update public.docentes d set documento = regexp_replace(d.documento, '[.\s-]', '', 'g')
where d.documento ~ '[.\s-]'
  and not exists (
    select 1 from public.docentes o
    where o.institucion_id = d.institucion_id and o.id <> d.id
      and o.documento = regexp_replace(d.documento, '[.\s-]', '', 'g')
  );

create or replace function public.normalizar_documento()
returns trigger language plpgsql as $$
begin
  new.documento := regexp_replace(trim(new.documento), '[.\s-]', '', 'g');
  return new;
end $$;

drop trigger if exists normalizar_documento on public.docentes;
create trigger normalizar_documento before insert or update of documento on public.docentes
  for each row execute function public.normalizar_documento();

create index if not exists docentes_documento_idx on public.docentes (documento);
create index if not exists docentes_email_idx on public.docentes (lower(email));

-- ── 2. Soportes de los permisos ───────────────────────────────────────────

alter table public.novedades add column if not exists soportes jsonb not null default '[]';

-- Espacio privado: máximo 5 MB por archivo; PDF o imagen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('soportes', 'soportes', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Ruta de cada archivo: <institución>/<docente>/<archivo>.
-- Lo ven y gestionan los directivos de la institución y el propio docente.
drop policy if exists "soportes_leer" on storage.objects;
drop policy if exists "soportes_subir" on storage.objects;
drop policy if exists "soportes_borrar" on storage.objects;

create policy "soportes_leer" on storage.objects for select to authenticated
  using (
    bucket_id = 'soportes' and (
      public.es_directivo_en((storage.foldername(name))[1])
      or (storage.foldername(name))[2] = public.docente_en((storage.foldername(name))[1])
    )
  );
create policy "soportes_subir" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'soportes' and (
      public.es_directivo_en((storage.foldername(name))[1])
      or (storage.foldername(name))[2] = public.docente_en((storage.foldername(name))[1])
    )
  );
create policy "soportes_borrar" on storage.objects for delete to authenticated
  using (
    bucket_id = 'soportes' and (
      public.es_directivo_en((storage.foldername(name))[1])
      or (storage.foldername(name))[2] = public.docente_en((storage.foldername(name))[1])
    )
  );

commit;
