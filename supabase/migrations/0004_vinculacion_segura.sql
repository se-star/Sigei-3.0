-- ═══════════════════════════════════════════════════════════════════════
--  SIGEI 3.0 · Vinculación segura de docentes
--  Ejecute este archivo completo en Supabase → SQL Editor → New query,
--  DESPUÉS de 0003_acceso_docentes.sql.
--
--  Una cuenta cuyo correo coincide con el de un docente queda vinculada a su
--  registro, pero solo se activa sola si el correo está comprobado de verdad:
--    - ingresó con un código enviado a ese correo (cuenta sin contraseña), o
--    - confirmó el correo con el enlace que envía Supabase.
--  Si el proyecto tiene desactivada la confirmación de correo, cualquiera podría
--  registrarse con el correo de un docente; en ese caso la membresía queda
--  pendiente (con el docente ya vinculado) hasta que un directivo la active.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ¿El correo de este usuario está comprobado?
create or replace function public.correo_comprobado(uid uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users u
    where u.id = uid
      and u.email_confirmed_at is not null
      and (
        coalesce(u.encrypted_password, '') = ''   -- cuenta creada con código: el código llegó a ese correo
        or u.confirmation_sent_at is not null     -- confirmó con el enlace enviado al correo
      )
  )
$$;
revoke execute on function public.correo_comprobado(uuid) from public, anon, authenticated;

create or replace function public.vincular_docente_usuario(uid uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  correo   text;
  activar  boolean := public.correo_comprobado(uid);
  d        record;
  n        int := 0;
begin
  select lower(u.email) into correo from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if correo is null or correo = '' then return 0; end if;

  for d in
    select doc.id, doc.institucion_id, doc.nombres, doc.apellidos
    from public.docentes doc
    join public.instituciones i on i.id = doc.institucion_id and i.activa
    where lower(trim(doc.email)) = correo and doc.estado <> 'retirado'
  loop
    insert into public.membresias (usuario_id, institucion_id, rol, docente_id, activo)
    values (uid, d.institucion_id, 'docente', d.id, activar)
    on conflict (usuario_id, institucion_id) do update
      set activo = public.membresias.activo or activar,   -- nunca desactiva a quien ya estaba activo
          docente_id = coalesce(public.membresias.docente_id, excluded.docente_id);
    n := n + 1;
    update public.perfiles
      set nombre = trim(d.nombres || ' ' || d.apellidos)
      where id = uid and (nombre = '' or nombre = split_part(correo, '@', 1));
  end loop;
  return n;
end $$;
revoke execute on function public.vincular_docente_usuario(uuid) from public, anon, authenticated;

commit;
