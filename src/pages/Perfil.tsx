import { Link } from 'react-router-dom';
import { Bell, Clock3, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react';
import { Avatar, Boton, Encabezado, Insignia, Tarjeta } from '@/components/ui';
import { FormClave } from '@/components/formularios/FormClave';
import { SolicitarAcceso } from '@/components/SolicitarAcceso';
import { useAuth } from '@/hooks/useAuth';
import { useTema, type Tema } from '@/hooks/useTema';
import { useTabla } from '@/hooks/useDatos';
import { modoDemo } from '@/lib/backend';
import { etiqueta, ROLES, tono } from '@/lib/catalogos';
import { cx, nombreDocente } from '@/lib/utils';

export default function Perfil() {
  const { perfil, instituciones, salir, ver } = useAuth();
  const { tema, setTema } = useTema();
  const { data: docentes = [] } = useTabla('docentes');
  if (!perfil) return null;
  const doc = docentes.find((d) => d.id === perfil.docente_id);
  const temas: { v: Tema; t: string; i: typeof Sun }[] = [
    { v: 'light', t: 'Claro', i: Sun },
    { v: 'dark', t: 'Oscuro', i: Moon },
    { v: 'system', t: 'Automático', i: Monitor },
  ];

  return (
    <>
      <Encabezado titulo="Mi perfil" />
      <div className="grid max-w-4xl gap-6 md:grid-cols-[1.2fr_1fr]">
        <Tarjeta>
          <div className="flex items-center gap-4">
            <Avatar nombre={perfil.nombre} tam={64} />
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold">{perfil.nombre}</p>
              <p className="truncate text-sm text-muted">{perfil.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {perfil.es_superadmin && <Insignia tono="violet">Superadministrador</Insignia>}
                {perfil.activo && <Insignia tono={tono(ROLES, perfil.rol)}>{etiqueta(ROLES, perfil.rol)}</Insignia>}
              </div>
            </div>
          </div>
          {doc && (
            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5">
              <p className="text-sm text-muted">
                Vinculado al registro docente <strong className="text-ink">{nombreDocente(doc)}</strong>.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/horarios?mio=1">
                  <Boton variante="secundario" tam="sm" icono={<Clock3 className="size-3.5" />}>
                    Mi horario
                  </Boton>
                </Link>
                <Link to="/novedades">
                  <Boton variante="secundario" tam="sm" icono={<Bell className="size-3.5" />}>
                    Mis permisos
                  </Boton>
                </Link>
                {ver('docentes') && <Link to={`/docentes/${doc.id}`}>
                  <Boton variante="secundario" tam="sm" icono={<UserRound className="size-3.5" />}>
                    Mi hoja de vida
                  </Boton>
                </Link>}
              </div>
            </div>
          )}
          <div className="mt-6 border-t border-line pt-5">
            <Boton variante="secundario" className="text-danger" icono={<LogOut className="size-4" />} onClick={salir}>
              Cerrar sesión
            </Boton>
          </div>
        </Tarjeta>
        <Tarjeta titulo="Mis instituciones" className="md:col-span-2">
          {instituciones.length === 0 ? (
            <p className="mb-4 text-sm text-muted">Aún no está vinculado a ninguna institución.</p>
          ) : (
            <ul className="mb-5 grid gap-2 sm:grid-cols-2">
              {instituciones.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 rounded-[20px] bg-surface-2 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{i.nombre}</span>
                    <span className="block text-xs text-muted">{i.activo ? etiqueta(ROLES, i.rol) : 'Solicitud pendiente'}</span>
                  </span>
                  {i.id === perfil.institucion_id ? <Insignia tono="lime">Actual</Insignia> : !i.activo && <Insignia tono="warn">Pendiente</Insignia>}
                </li>
              ))}
            </ul>
          )}
          {!perfil.es_superadmin && (
            <>
              <p className="mb-2 text-sm font-medium">¿Trabaja en otra institución?</p>
              <SolicitarAcceso />
            </>
          )}
        </Tarjeta>
        {!modoDemo && (
          <Tarjeta titulo="Cambiar contraseña" className="md:col-start-1">
            <FormClave />
          </Tarjeta>
        )}
        <Tarjeta titulo="Apariencia" className="md:col-start-2 md:row-start-1">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
            {temas.map(({ v, t, i: I }) => (
              <button
                key={v}
                role="radio"
                aria-checked={tema === v}
                onClick={() => setTema(v)}
                className={cx('flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-semibold transition', tema === v ? 'border-brand bg-brand-soft text-brand-soft-ink' : 'border-line hover:border-line-strong')}
              >
                <I className="size-5" />
                {t}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Atajo: presione Ctrl + K en cualquier pantalla para buscar y navegar.</p>
        </Tarjeta>
      </div>
    </>
  );
}
