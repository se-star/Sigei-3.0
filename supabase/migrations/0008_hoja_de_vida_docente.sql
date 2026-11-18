-- ════════════════════════════════════════════════════════════════════════════
--  SIGEI TIC · El docente llena su hoja de vida
--  Cada docente puede actualizar, en su propio registro, su formación, su
--  experiencia, sus documentos y su teléfono. Los demás datos (documento,
--  cargo, vinculación, carga, estado…) siguen siendo solo de los directivos.
--  Requiere la migración 0006_hoja_de_vida.sql. Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Permiso de actualizar solo su propio registro (se suma al de directivos).
drop policy if exists "docente_su_hoja_de_vida" on public.docentes;
create policy "docente_su_hoja_de_vida" on public.docentes for update to authenticated
  using (id = public.docente_en(institucion_id))
  with check (id = public.docente_en(institucion_id));

-- 2. Si quien actualiza no es directivo, solo pueden cambiar los campos de la hoja de vida.
create or replace function public.proteger_datos_docente()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  libres constant text[] := array['formacion', 'experiencia', 'documentos', 'telefono', 'updated_at'];
begin
  -- Directivos de la institución y procesos del servidor (sin usuario) no tienen restricción.
  if auth.uid() is null or public.es_directivo_en(old.institucion_id) then
    return new;
  end if;
  if (to_jsonb(new) - libres) is distinct from (to_jsonb(old) - libres) then
    raise exception 'Como docente solo puede actualizar su hoja de vida y su teléfono.'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists zz_proteger_datos_docente on public.docentes;
create trigger zz_proteger_datos_docente before update on public.docentes
  for each row execute function public.proteger_datos_docente();

notify pgrst, 'reload schema';
