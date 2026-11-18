-- ════════════════════════════════════════════════════════════════════════════
--  SIGEI TIC · Avisos por correo y certificado de permisos
--  Guarda el cargo de quien aprobó o rechazó la solicitud (rector, coordinador…)
--  para que el certificado de autorización lo muestre aunque se descargue
--  después. Se puede ejecutar más de una vez.
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

notify pgrst, 'reload schema';
