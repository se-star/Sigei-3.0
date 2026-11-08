-- ═══════════════════════════════════════════════════════════════════════
--  SIGEI 3.0 · Esquema inicial
--  Ejecute este archivo completo en Supabase → SQL Editor → New query.
--  Crea las tablas, las reglas de seguridad por rol (RLS) y la auditoría.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Utilidades ─────────────────────────────────────────────────────────

create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Perfiles (uno por usuario de Supabase Auth) ───────────────────────

create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null default '',
  email       text not null default '',
  rol         text not null default 'docente' check (rol in ('admin', 'rector', 'coordinador', 'docente')),
  docente_id  text,
  activo      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Funciones de apoyo para las políticas. SECURITY DEFINER evita recursión de RLS.
create or replace function public.mi_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid() and activo
$$;

create or replace function public.es_directivo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol() in ('admin', 'rector', 'coordinador'), false)
$$;

create or replace function public.es_rectoria()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol() in ('admin', 'rector'), false)
$$;

create or replace function public.mi_docente()
returns text language sql stable security definer set search_path = public as $$
  select docente_id from public.perfiles where id = auth.uid() and activo
$$;

-- Al registrarse un usuario se crea su perfil. El primero queda como
-- administrador activo; los demás quedan pendientes de activación.
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  primero boolean;
begin
  select not exists (select 1 from public.perfiles) into primero;
  insert into public.perfiles (id, nombre, email, rol, activo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    new.email,
    case when primero then 'admin' else 'docente' end,
    primero
  );
  return new;
end $$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ── Tablas institucionales ────────────────────────────────────────────
-- Los identificadores son texto para poder restaurar respaldos sin conflictos.

create table public.ajustes (
  id                     text primary key default 'ajustes',
  institucion            text not null default '',
  sigla                  text not null default '',
  codigo_dane            text not null default '',
  nit                    text not null default '',
  municipio              text not null default '',
  rector                 text not null default '',
  anio_lectivo           int  not null default extract(year from now()),
  periodos               int  not null default 3,
  logo_url               text not null default '',
  franjas                jsonb not null default '[]',
  criterios_seguimiento  jsonb not null default '[]',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.sedes (
  id          text primary key default gen_random_uuid()::text,
  nombre      text not null,
  direccion   text not null default '',
  telefono    text not null default '',
  email       text not null default '',
  principal   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.areas (
  id          text primary key default gen_random_uuid()::text,
  nombre      text not null,
  color       text not null default '#0f766e',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.asignaturas (
  id          text primary key default gen_random_uuid()::text,
  nombre      text not null,
  area_id     text references public.areas (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.docentes (
  id                text primary key default gen_random_uuid()::text,
  documento         text not null unique,
  nombres           text not null,
  apellidos         text not null,
  email             text not null default '',
  telefono          text not null default '',
  fecha_nacimiento  date,
  genero            text not null default '' check (genero in ('', 'F', 'M', 'O')),
  area_id           text references public.areas (id) on delete set null,
  sede_id           text references public.sedes (id) on delete set null,
  vinculacion       text not null default 'planta' check (vinculacion in ('planta', 'provisional', 'temporal', 'catedra', 'contratista')),
  escalafon         text not null default '',
  cargo             text not null default '',
  estado            text not null default 'activo' check (estado in ('activo', 'licencia', 'inactivo', 'retirado')),
  carga_maxima      int  not null default 22 check (carga_maxima between 0 and 60),
  fecha_ingreso     date,
  notas             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.perfiles
  add constraint perfiles_docente_fk foreign key (docente_id) references public.docentes (id) on delete set null;

create table public.grados (
  id          text primary key default gen_random_uuid()::text,
  nombre      text not null,
  nivel       text not null check (nivel in ('preescolar', 'primaria', 'secundaria', 'media')),
  orden       int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.grupos (
  id           text primary key default gen_random_uuid()::text,
  grado_id     text not null references public.grados (id) on delete restrict,
  nombre       text not null,
  jornada      text not null default 'manana' check (jornada in ('manana', 'tarde', 'unica', 'nocturna')),
  sede_id      text references public.sedes (id) on delete set null,
  director_id  text references public.docentes (id) on delete set null,
  capacidad    int  not null default 38 check (capacidad >= 0),
  estudiantes  int  not null default 0 check (estudiantes >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.asignaciones (
  id               text primary key default gen_random_uuid()::text,
  docente_id       text not null references public.docentes (id) on delete cascade,
  grupo_id         text not null references public.grupos (id) on delete cascade,
  asignatura_id    text not null references public.asignaturas (id) on delete restrict,
  horas_semanales  int  not null check (horas_semanales > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (grupo_id, asignatura_id)
);

create table public.horarios (
  id             text primary key default gen_random_uuid()::text,
  grupo_id       text not null references public.grupos (id) on delete cascade,
  asignatura_id  text not null references public.asignaturas (id) on delete restrict,
  docente_id     text references public.docentes (id) on delete set null,
  dia            smallint not null check (dia between 1 and 6),
  hora_inicio    text not null check (hora_inicio ~ '^\d{2}:\d{2}$'),
  hora_fin       text not null check (hora_fin ~ '^\d{2}:\d{2}$'),
  aula           text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (hora_inicio < hora_fin)
);

create table public.novedades (
  id                    text primary key default gen_random_uuid()::text,
  docente_id            text not null references public.docentes (id) on delete cascade,
  tipo                  text not null check (tipo in ('permiso_personal', 'incapacidad', 'calamidad', 'licencia', 'comision', 'capacitacion', 'otro')),
  fecha_inicio          date not null,
  fecha_fin             date not null,
  horas                 int  not null default 0 check (horas >= 0),
  motivo                text not null default '',
  estado                text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada', 'anulada')),
  reemplazo_id          text references public.docentes (id) on delete set null,
  revisado_por          text,
  revisado_en           timestamptz,
  observacion_revision  text not null default '',
  creado_por            uuid references public.perfiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

create table public.seguimientos (
  id             text primary key default gen_random_uuid()::text,
  docente_id     text not null references public.docentes (id) on delete cascade,
  grupo_id       text references public.grupos (id) on delete set null,
  fecha          date not null default current_date,
  tipo           text not null check (tipo in ('visita_aula', 'planeacion', 'evaluacion', 'entrevista', 'otro')),
  criterios      jsonb not null default '[]',
  fortalezas     text not null default '',
  oportunidades  text not null default '',
  compromisos    text not null default '',
  estado         text not null default 'borrador' check (estado in ('borrador', 'socializado')),
  observador     text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.eventos (
  id            text primary key default gen_random_uuid()::text,
  titulo        text not null,
  tipo          text not null default 'academico' check (tipo in ('academico', 'institucional', 'cultural', 'deportivo', 'reunion', 'festivo', 'otro')),
  fecha_inicio  date not null,
  fecha_fin     date,
  hora_inicio   text,
  hora_fin      text,
  lugar         text not null default '',
  responsable   text not null default '',
  descripcion   text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.comunicados (
  id            text primary key default gen_random_uuid()::text,
  titulo        text not null,
  contenido     text not null,
  prioridad     text not null default 'normal' check (prioridad in ('baja', 'normal', 'alta')),
  audiencia     text not null default 'todos' check (audiencia in ('todos', 'docentes', 'directivos')),
  fijado        boolean not null default false,
  autor         text not null default '',
  publicado_en  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.tareas (
  id              text primary key default gen_random_uuid()::text,
  titulo          text not null,
  descripcion     text not null default '',
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'en_progreso', 'hecha')),
  prioridad       text not null default 'normal' check (prioridad in ('baja', 'normal', 'alta')),
  fecha_limite    date,
  responsable_id  uuid references public.perfiles (id) on delete set null,
  creado_por      uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.actividad (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  usuario      text not null,
  accion       text not null check (accion in ('crear', 'editar', 'eliminar')),
  tabla        text not null,
  registro_id  text,
  resumen      text not null default ''
);

create index on public.asignaciones (docente_id);
create index on public.horarios (grupo_id);
create index on public.horarios (docente_id, dia);
create index on public.novedades (docente_id, fecha_inicio);
create index on public.novedades (estado);
create index on public.seguimientos (docente_id);
create index on public.eventos (fecha_inicio);
create index on public.actividad (created_at desc);

-- ── updated_at automático ─────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['perfiles','ajustes','sedes','areas','asignaturas','docentes','grados','grupos',
                           'asignaciones','horarios','novedades','seguimientos','eventos','comunicados','tareas']
  loop
    execute format('create trigger tocar_updated_at before update on public.%I
                    for each row execute function public.tocar_updated_at()', t);
  end loop;
end $$;

-- ── Auditoría: cada cambio queda en la tabla actividad ────────────────

create or replace function public.auditar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fila   jsonb := to_jsonb(coalesce(new, old));
  quien  text;
begin
  select nombre into quien from public.perfiles where id = auth.uid();
  insert into public.actividad (usuario, accion, tabla, registro_id, resumen)
  values (
    coalesce(quien, 'Sistema'),
    case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'editar' else 'eliminar' end,
    tg_table_name,
    fila ->> 'id',
    coalesce(
      fila ->> 'titulo',
      fila ->> 'nombre',
      nullif(trim(coalesce(fila ->> 'nombres', '') || ' ' || coalesce(fila ->> 'apellidos', '')), ''),
      fila ->> 'tipo',
      ''
    )
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['perfiles','ajustes','sedes','areas','asignaturas','docentes','grados','grupos',
                           'asignaciones','horarios','novedades','seguimientos','eventos','comunicados','tareas']
  loop
    execute format('create trigger auditar after insert or update or delete on public.%I
                    for each row execute function public.auditar()', t);
  end loop;
end $$;

-- ── Seguridad por rol (Row Level Security) ────────────────────────────
-- Refleja src/lib/permisos.ts. Un usuario inactivo no puede leer nada.

do $$
declare t text;
begin
  foreach t in array array['perfiles','ajustes','sedes','areas','asignaturas','docentes','grados','grupos',
                           'asignaciones','horarios','novedades','seguimientos','eventos','comunicados','tareas','actividad']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Lectura para cualquier usuario activo; escritura para directivos.
do $$
declare t text;
begin
  foreach t in array array['areas','asignaturas','docentes','grados','grupos','asignaciones','horarios','eventos']
  loop
    execute format('create policy "leer" on public.%I for select to authenticated using (public.mi_rol() is not null)', t);
    execute format('create policy "escribir" on public.%I for all to authenticated using (public.es_directivo()) with check (public.es_directivo())', t);
  end loop;
end $$;

-- Sedes y configuración: solo administración y rectoría modifican.
create policy "leer" on public.sedes for select to authenticated using (public.mi_rol() is not null);
create policy "escribir" on public.sedes for all to authenticated using (public.es_rectoria()) with check (public.es_rectoria());
create policy "leer" on public.ajustes for select to authenticated using (public.mi_rol() is not null);
create policy "escribir" on public.ajustes for all to authenticated using (public.es_rectoria()) with check (public.es_rectoria());

-- Perfiles: todos ven la lista de usuarios activos y su propio perfil (aunque esté pendiente);
-- solo el administrador activa cuentas y asigna roles.
create policy "leer" on public.perfiles for select to authenticated
  using (id = auth.uid() or public.mi_rol() is not null);
create policy "administrar" on public.perfiles for update to authenticated
  using (public.mi_rol() = 'admin') with check (public.mi_rol() = 'admin');

-- Novedades: el docente ve y radica las suyas; directivos gestionan todas.
create policy "leer" on public.novedades for select to authenticated
  using (public.es_directivo() or docente_id = public.mi_docente());
create policy "radicar" on public.novedades for insert to authenticated
  with check (public.es_directivo() or (docente_id = public.mi_docente() and estado = 'pendiente'));
create policy "editar" on public.novedades for update to authenticated
  using (public.es_directivo() or (docente_id = public.mi_docente() and estado = 'pendiente'))
  with check (public.es_directivo() or (docente_id = public.mi_docente() and estado in ('pendiente', 'anulada')));
create policy "eliminar" on public.novedades for delete to authenticated using (public.es_directivo());

-- Seguimiento: el docente solo ve lo socializado con él.
create policy "leer" on public.seguimientos for select to authenticated
  using (public.es_directivo() or (docente_id = public.mi_docente() and estado = 'socializado'));
create policy "escribir" on public.seguimientos for all to authenticated
  using (public.es_directivo()) with check (public.es_directivo());

-- Comunicados: los dirigidos a directivos no los ven los docentes.
create policy "leer" on public.comunicados for select to authenticated
  using (public.es_directivo() or (public.mi_rol() is not null and audiencia <> 'directivos'));
create policy "escribir" on public.comunicados for all to authenticated
  using (public.es_directivo()) with check (public.es_directivo());

-- Tareas: cualquiera crea; edita quien la creó, su responsable o un directivo.
create policy "leer" on public.tareas for select to authenticated using (public.mi_rol() is not null);
create policy "crear" on public.tareas for insert to authenticated with check (public.mi_rol() is not null);
create policy "editar" on public.tareas for update to authenticated
  using (public.es_directivo() or responsable_id = auth.uid() or creado_por = auth.uid());
create policy "eliminar" on public.tareas for delete to authenticated
  using (public.es_directivo() or creado_por = auth.uid());

-- Actividad: solo lectura para administración y rectoría (la escribe el disparador).
create policy "leer" on public.actividad for select to authenticated using (public.es_rectoria());

-- ── Datos base ────────────────────────────────────────────────────────

insert into public.ajustes (id, institucion, franjas, criterios_seguimiento) values (
  'ajustes',
  'Mi institución educativa',
  '[{"inicio":"06:30","fin":"07:25"},{"inicio":"07:25","fin":"08:20"},{"inicio":"08:20","fin":"09:15"},
    {"inicio":"09:15","fin":"09:45","descanso":true},{"inicio":"09:45","fin":"10:40"},
    {"inicio":"10:40","fin":"11:35"},{"inicio":"11:35","fin":"12:30"}]',
  '["Planeación de la clase","Dominio disciplinar","Estrategias didácticas","Manejo del grupo y convivencia","Evaluación formativa","Uso de recursos y TIC"]'
);
