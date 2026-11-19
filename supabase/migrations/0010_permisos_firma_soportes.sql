-- ════════════════════════════════════════════════════════════════════════════
--  SIGEI TIC · Firma en el certificado y soportes después de aprobar
--  1. Cada persona guarda su firma (imagen PNG) para el certificado de permisos.
--  2. Cada novedad guarda quién la revisó, para poner su firma en el certificado.
--  3. El docente puede adjuntar el soporte de un permiso ya aprobado
--     (incapacidad o calamidad con «soporte pendiente») sin poder cambiar
--     nada más de la solicitud.
--  Requiere la migración 0009_permisos_correo.sql. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Firma de cada persona (PNG en texto, máximo unos 220 KB).
alter table public.perfiles add column if not exists firma_url text not null default '';
alter table public.perfiles drop constraint if exists firma_url_valida;
alter table public.perfiles add constraint firma_url_valida
  check (firma_url = '' or (firma_url like 'data:image/png;base64,%' and length(firma_url) <= 300000));

-- Los perfiles solo los cambia el superadministrador; la firma propia se guarda con esta función.
create or replace function public.guardar_mi_firma(firma text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Inicie sesión de nuevo.' using errcode = '42501';
  end if;
  update public.perfiles set firma_url = coalesce(firma, '') where id = auth.uid();
end
$$;
revoke all on function public.guardar_mi_firma(text) from public;
grant execute on function public.guardar_mi_firma(text) to authenticated;

-- 2. Quién revisó cada novedad.
alter table public.novedades add column if not exists revisado_por_id uuid references public.perfiles (id) on delete set null;

-- 3. Adjuntar soportes a una novedad ya revisada.
create or replace function public.agregar_soportes_novedad(novedad text, nuevos jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  n public.novedades;
begin
  select * into n from public.novedades where id = novedad;
  if not found then
    raise exception 'No encontramos la solicitud.' using errcode = 'P0002';
  end if;
  if n.docente_id is distinct from public.docente_en(n.institucion_id) and not public.es_directivo_en(n.institucion_id) then
    raise exception 'Solo el docente de la solicitud o un directivo pueden adjuntar soportes.' using errcode = '42501';
  end if;
  if jsonb_typeof(nuevos) is distinct from 'array' or jsonb_array_length(nuevos) = 0 or jsonb_array_length(nuevos) > 10 then
    raise exception 'Adjunte entre 1 y 10 archivos.' using errcode = '22023';
  end if;
  -- Cada archivo debe estar en la carpeta de ese docente en esa institución.
  if exists (
    select 1 from jsonb_array_elements(nuevos) e
    where jsonb_typeof(e) <> 'object' or coalesce(e ->> 'ruta', '') not like (n.institucion_id || '/' || n.docente_id || '/%')
  ) then
    raise exception 'Los archivos no corresponden a esta solicitud.' using errcode = '22023';
  end if;
  update public.novedades set soportes = coalesce(soportes, '[]'::jsonb) || nuevos where id = novedad;
end
$$;
revoke all on function public.agregar_soportes_novedad(text, jsonb) from public;
grant execute on function public.agregar_soportes_novedad(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
