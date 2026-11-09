-- ═══════════════════════════════════════════════════════════════════════
--  SIGEI 3.0 · Varias instituciones en una sola plataforma
--  Ejecute este archivo completo en Supabase → SQL Editor → New query,
--  DESPUÉS de 0001_esquema_inicial.sql. Sirve tanto para un proyecto nuevo
--  como para uno que ya tiene datos: la institución actual se convierte en la
--  primera institución de la plataforma y nada se pierde.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Quitar las políticas y funciones del modelo de una sola institución ──

do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- La auditoría se apaga durante la conversión y se vuelve a crear al final.
do $$
declare t text;
begin
  foreach t in array array['perfiles','ajustes','sedes','areas','asignaturas','docentes','grados','grupos',
                           'asignaciones','horarios','novedades','seguimientos','eventos','comunicados','tareas']
  loop
    execute format('drop trigger if exists auditar on public.%I', t);
  end loop;
end $$;

drop function if exists public.es_directivo();
drop function if exists public.es_rectoria();
drop function if exists public.mi_docente();
drop function if exists public.mi_rol();

-- ── 2. Instituciones: cada fila de ajustes pasa a ser una institución ─────

alter table public.ajustes rename to instituciones;
alter table public.instituciones alter column id set default gen_random_uuid()::text;
alter table public.instituciones add column if not exists activa boolean not null default true;
alter table public.instituciones rename column institucion to nombre;

-- La fila heredada se llamaba 'ajustes'; se le da un identificador propio.
do $$
declare nuevo text := gen_random_uuid()::text;
begin
  if exists (select 1 from public.instituciones where id = 'ajustes') then
    update public.instituciones set id = nuevo where id = 'ajustes';
  end if;
  if not exists (select 1 from public.instituciones) then
    insert into public.instituciones (nombre) values ('Mi institución educativa');
  end if;
end $$;

-- ── 3. Cada tabla institucional se marca con su institución ───────────────

do $$
declare
  t text;
  inicial text := (select id from public.instituciones order by created_at limit 1);
begin
  foreach t in array array['sedes','areas','asignaturas','docentes','grados','grupos','asignaciones',
                           'horarios','novedades','seguimientos','eventos','comunicados','tareas','actividad']
  loop
    execute format('alter table public.%I add column institucion_id text', t);
    execute format('update public.%I set institucion_id = %L', t, inicial);
    execute format('alter table public.%I alter column institucion_id set not null', t);
    execute format('alter table public.%I add constraint %I foreign key (institucion_id)
                    references public.instituciones (id) on delete cascade', t, t || '_institucion_fk');
    execute format('create index on public.%I (institucion_id)', t);
  end loop;
end $$;

-- El documento de un docente es único dentro de cada institución, no en toda la plataforma.
alter table public.docentes drop constraint if exists docentes_documento_key;
alter table public.docentes add constraint docentes_documento_inst_key unique (institucion_id, documento);

-- ── 4. Membresías: el rol ahora es por institución ────────────────────────

create table public.membresias (
  usuario_id      uuid not null references public.perfiles (id) on delete cascade,
  institucion_id  text not null references public.instituciones (id) on delete cascade,
  rol             text not null default 'docente' check (rol in ('admin', 'rector', 'coordinador', 'docente')),
  docente_id      text references public.docentes (id) on delete set null,
  activo          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (usuario_id, institucion_id)
);
create index on public.membresias (institucion_id);
create trigger tocar_updated_at before update on public.membresias
  for each row execute function public.tocar_updated_at();

alter table public.perfiles add column es_superadmin boolean not null default false;

-- Los usuarios existentes conservan su rol en la institución inicial.
insert into public.membresias (usuario_id, institucion_id, rol, docente_id, activo)
select p.id, (select id from public.instituciones order by created_at limit 1), p.rol, p.docente_id, p.activo
from public.perfiles p;

-- El primer administrador registrado queda como superadministrador.
update public.perfiles set es_superadmin = true
where id = (select id from public.perfiles where rol = 'admin' and activo order by created_at limit 1);

alter table public.perfiles drop constraint if exists perfiles_docente_fk;
alter table public.perfiles drop column rol;
alter table public.perfiles drop column docente_id;
alter table public.perfiles drop column activo;

-- ── 5. Funciones de apoyo para las políticas ──────────────────────────────

create or replace function public.es_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select es_superadmin from public.perfiles where id = auth.uid()), false)
$$;

-- Rol del usuario en una institución. El superadministrador actúa como administrador en todas.
create or replace function public.rol_en(inst text)
returns text language sql stable security definer set search_path = public as $$
  select case when public.es_superadmin() then 'admin'
              else (select rol from public.membresias
                    where usuario_id = auth.uid() and institucion_id = inst and activo) end
$$;

create or replace function public.es_miembro(inst text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.rol_en(inst) is not null
$$;

create or replace function public.es_directivo_en(inst text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_en(inst) in ('admin', 'rector', 'coordinador'), false)
$$;

create or replace function public.es_rectoria_en(inst text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_en(inst) in ('admin', 'rector'), false)
$$;

create or replace function public.es_admin_en(inst text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_en(inst) = 'admin', false)
$$;

create or replace function public.docente_en(inst text)
returns text language sql stable security definer set search_path = public as $$
  select docente_id from public.membresias where usuario_id = auth.uid() and institucion_id = inst and activo
$$;

-- ¿Comparte alguna institución con ese usuario? (para ver nombres de compañeros)
create or replace function public.comparte_institucion(otro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membresias a join public.membresias b on a.institucion_id = b.institucion_id
    where a.usuario_id = auth.uid() and a.activo and b.usuario_id = otro
  )
$$;

-- ── 6. Registro de usuarios ───────────────────────────────────────────────
-- El primer usuario de la plataforma es superadministrador. Los demás eligen
-- institución al registrarse y quedan pendientes hasta que un administrador los active.

create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  primero boolean;
  inst    text := nullif(new.raw_user_meta_data ->> 'institucion_id', '');
begin
  select not exists (select 1 from public.perfiles) into primero;
  insert into public.perfiles (id, nombre, email, es_superadmin)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    new.email,
    primero
  );
  if inst is not null and exists (select 1 from public.instituciones where id = inst and activa) then
    insert into public.membresias (usuario_id, institucion_id, rol, activo) values (new.id, inst, 'docente', false);
  end if;
  return new;
end $$;

-- Lista pública (solo nombre y municipio) para elegir institución al registrarse.
create or replace function public.instituciones_publicas()
returns table (id text, nombre text, municipio text)
language sql stable security definer set search_path = public as $$
  select id, nombre, municipio from public.instituciones where activa order by nombre
$$;
grant execute on function public.instituciones_publicas() to anon, authenticated;

-- Un administrador agrega a alguien ya registrado, por su correo.
create or replace function public.agregar_miembro(inst text, correo text, nuevo_rol text default 'docente')
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.es_admin_en(inst) then raise exception 'No tiene permisos para agregar personas a esta institución.'; end if;
  if nuevo_rol not in ('admin', 'rector', 'coordinador', 'docente') then raise exception 'Rol no válido.'; end if;
  select id into uid from public.perfiles where lower(email) = lower(trim(correo));
  if uid is null then return 'no_registrado'; end if;
  insert into public.membresias (usuario_id, institucion_id, rol, activo)
  values (uid, inst, nuevo_rol, true)
  on conflict (usuario_id, institucion_id) do update set rol = excluded.rol, activo = true;
  return 'agregado';
end $$;
grant execute on function public.agregar_miembro(text, text, text) to authenticated;

-- Indicadores de cada institución para el panel del superadministrador.
create or replace function public.resumen_instituciones()
returns table (institucion_id text, docentes bigint, grupos bigint, estudiantes bigint, usuarios bigint, pendientes bigint)
language sql stable security definer set search_path = public as $$
  select i.id,
    (select count(*) from public.docentes d where d.institucion_id = i.id and d.estado <> 'retirado'),
    (select count(*) from public.grupos g where g.institucion_id = i.id),
    (select coalesce(sum(g.estudiantes), 0) from public.grupos g where g.institucion_id = i.id),
    (select count(*) from public.membresias m where m.institucion_id = i.id and m.activo),
    (select count(*) from public.membresias m where m.institucion_id = i.id and not m.activo)
  from public.instituciones i
  where public.es_superadmin()
$$;
grant execute on function public.resumen_instituciones() to authenticated;

-- ── 7. Auditoría con institución ──────────────────────────────────────────

create or replace function public.auditar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fila   jsonb := to_jsonb(coalesce(new, old));
  quien  text;
  inst   text := coalesce(fila ->> 'institucion_id', case when tg_table_name = 'instituciones' then fila ->> 'id' end);
begin
  if inst is null then return null; end if;
  select nombre into quien from public.perfiles where id = auth.uid();
  insert into public.actividad (institucion_id, usuario, accion, tabla, registro_id, resumen)
  values (
    inst,
    coalesce(quien, 'Sistema'),
    case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'eliminar' end,
    tg_table_name,
    coalesce(fila ->> 'id', fila ->> 'usuario_id'),
    coalesce(
      fila ->> 'titulo',
      fila ->> 'nombre',
      nullif(trim(coalesce(fila ->> 'nombres', '') || ' ' || coalesce(fila ->> 'apellidos', '')), ''),
      fila ->> 'tipo',
      fila ->> 'rol',
      ''
    )
  );
  return null;
exception when foreign_key_violation then
  return null; -- la institución se está eliminando
end $$;

do $$
declare t text;
begin
  foreach t in array array['instituciones','membresias','sedes','areas','asignaturas','docentes','grados','grupos',
                           'asignaciones','horarios','novedades','seguimientos','eventos','comunicados','tareas']
  loop
    execute format('create trigger auditar after insert or update or delete on public.%I
                    for each row execute function public.auditar()', t);
  end loop;
end $$;

-- ── 8. Seguridad por institución (Row Level Security) ─────────────────────

alter table public.membresias enable row level security;

-- Tablas académicas: lectura para miembros, escritura para directivos de esa institución.
do $$
declare t text;
begin
  foreach t in array array['areas','asignaturas','docentes','grados','grupos','asignaciones','horarios','eventos']
  loop
    execute format('create policy "leer" on public.%I for select to authenticated using (public.es_miembro(institucion_id))', t);
    execute format('create policy "escribir" on public.%I for all to authenticated
                    using (public.es_directivo_en(institucion_id)) with check (public.es_directivo_en(institucion_id))', t);
  end loop;
end $$;

create policy "leer" on public.sedes for select to authenticated using (public.es_miembro(institucion_id));
create policy "escribir" on public.sedes for all to authenticated
  using (public.es_rectoria_en(institucion_id)) with check (public.es_rectoria_en(institucion_id));

-- Instituciones: los miembros ven la suya; rectoría ajusta su configuración; el superadministrador crea y elimina.
create policy "leer" on public.instituciones for select to authenticated using (public.es_miembro(id));
create policy "configurar" on public.instituciones for update to authenticated
  using (public.es_rectoria_en(id)) with check (public.es_rectoria_en(id));
create policy "crear" on public.instituciones for insert to authenticated with check (public.es_superadmin());
create policy "eliminar" on public.instituciones for delete to authenticated using (public.es_superadmin());

-- Perfiles: cada quien ve el suyo y el de sus compañeros de institución.
-- Solo el superadministrador modifica perfiles (así nadie puede darse privilegios).
create policy "leer" on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_superadmin() or public.comparte_institucion(id));
create policy "administrar" on public.perfiles for update to authenticated
  using (public.es_superadmin()) with check (public.es_superadmin());

-- Membresías: los miembros ven la lista de su institución; cada quien ve sus solicitudes;
-- cualquiera puede solicitar acceso (queda inactiva); el administrador activa y asigna roles.
create policy "leer" on public.membresias for select to authenticated
  using (usuario_id = auth.uid() or public.es_miembro(institucion_id));
create policy "solicitar" on public.membresias for insert to authenticated
  with check (
    public.es_admin_en(institucion_id)
    or (usuario_id = auth.uid() and not activo and rol = 'docente' and docente_id is null)
  );
create policy "administrar" on public.membresias for update to authenticated
  using (public.es_admin_en(institucion_id)) with check (public.es_admin_en(institucion_id));
create policy "retirar" on public.membresias for delete to authenticated
  using (public.es_admin_en(institucion_id) or (usuario_id = auth.uid() and not activo));

-- Novedades: el docente ve y radica las suyas; directivos gestionan las de su institución.
create policy "leer" on public.novedades for select to authenticated
  using (public.es_directivo_en(institucion_id) or docente_id = public.docente_en(institucion_id));
create policy "radicar" on public.novedades for insert to authenticated
  with check (public.es_directivo_en(institucion_id)
              or (docente_id = public.docente_en(institucion_id) and estado = 'pendiente'));
create policy "editar" on public.novedades for update to authenticated
  using (public.es_directivo_en(institucion_id)
         or (docente_id = public.docente_en(institucion_id) and estado = 'pendiente'))
  with check (public.es_directivo_en(institucion_id)
              or (docente_id = public.docente_en(institucion_id) and estado in ('pendiente', 'anulada')));
create policy "eliminar" on public.novedades for delete to authenticated using (public.es_directivo_en(institucion_id));

create policy "leer" on public.seguimientos for select to authenticated
  using (public.es_directivo_en(institucion_id)
         or (docente_id = public.docente_en(institucion_id) and estado = 'socializado'));
create policy "escribir" on public.seguimientos for all to authenticated
  using (public.es_directivo_en(institucion_id)) with check (public.es_directivo_en(institucion_id));

create policy "leer" on public.comunicados for select to authenticated
  using (public.es_directivo_en(institucion_id) or (public.es_miembro(institucion_id) and audiencia <> 'directivos'));
create policy "escribir" on public.comunicados for all to authenticated
  using (public.es_directivo_en(institucion_id)) with check (public.es_directivo_en(institucion_id));

create policy "leer" on public.tareas for select to authenticated using (public.es_miembro(institucion_id));
create policy "crear" on public.tareas for insert to authenticated with check (public.es_miembro(institucion_id));
create policy "editar" on public.tareas for update to authenticated
  using (public.es_directivo_en(institucion_id)
         or (public.es_miembro(institucion_id) and (responsable_id = auth.uid() or creado_por = auth.uid())))
  with check (public.es_miembro(institucion_id));
create policy "eliminar" on public.tareas for delete to authenticated
  using (public.es_directivo_en(institucion_id) or (public.es_miembro(institucion_id) and creado_por = auth.uid()));

create policy "leer" on public.actividad for select to authenticated using (public.es_rectoria_en(institucion_id));

-- ── 9. Evitar referencias cruzadas entre instituciones ────────────────────
-- Un registro solo puede apuntar a registros de su misma institución.

-- SECURITY DEFINER: debe ver el registro relacionado aunque RLS lo oculte al usuario.
create or replace function public.validar_misma_institucion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  campo  text;
  tabla  text;
  valor  text;
  otra   text;
  pares  text[][] := array[
    ['area_id','areas'], ['sede_id','sedes'], ['docente_id','docentes'], ['grado_id','grados'],
    ['grupo_id','grupos'], ['director_id','docentes'], ['asignatura_id','asignaturas'], ['reemplazo_id','docentes']
  ];
begin
  for i in 1 .. array_length(pares, 1) loop
    campo := pares[i][1];
    tabla := pares[i][2];
    valor := to_jsonb(new) ->> campo;
    if valor is not null then
      execute format('select institucion_id from public.%I where id = $1', tabla) into otra using valor;
      if otra is not null and otra <> new.institucion_id then
        raise exception 'El registro relacionado (%) pertenece a otra institución.', campo;
      end if;
    end if;
  end loop;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['asignaturas','docentes','grupos','asignaciones','horarios','novedades','seguimientos']
  loop
    execute format('create trigger validar_institucion before insert or update on public.%I
                    for each row execute function public.validar_misma_institucion()', t);
  end loop;
end $$;

create or replace function public.validar_docente_membresia()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.docente_id is not null and not exists (
    select 1 from public.docentes where id = new.docente_id and institucion_id = new.institucion_id
  ) then
    raise exception 'El docente vinculado pertenece a otra institución.';
  end if;
  return new;
end $$;
create trigger validar_institucion before insert or update on public.membresias
  for each row execute function public.validar_docente_membresia();

commit;
