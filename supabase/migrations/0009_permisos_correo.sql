-- ════════════════════════════════════════════════════════════════════════════
--  SIGEI TIC · Avisos por correo y certificado de permisos
--  1. Guarda el cargo de quien aprobó o rechazó la solicitud (rector,
--     coordinador…) para que el certificado lo muestre aunque se descargue después.
--  2. Textos del certificado personalizados por cada institución
--     (Configuración → Certificado de permisos).
--  Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.novedades add column if not exists revisado_rol text not null default '';

-- Solicitudes ya revisadas: el cargo de quien aparece como revisor, si se encuentra.
update public.novedades n
set revisado_rol = m.rol
from public.membresias m
join public.perfiles p on p.id = m.usuario_id
where n.revisado_rol = ''
  and n.revisado_por is not null
  and m.institucion_id = n.institucion_id
  and m.rol in ('rector', 'coordinador', 'admin')
  and p.nombre = n.revisado_por;

alter table public.instituciones add column if not exists plantilla_certificado jsonb not null default '{}';
alter table public.instituciones drop constraint if exists plantilla_certificado_objeto;
alter table public.instituciones add constraint plantilla_certificado_objeto check (jsonb_typeof(plantilla_certificado) = 'object');

notify pgrst, 'reload schema';
