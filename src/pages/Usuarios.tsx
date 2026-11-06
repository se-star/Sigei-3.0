import { useState } from 'react';
import { Check, Info, Minus, Pencil, ShieldCheck, Eye } from 'lucide-react';
import { Avatar, Boton, Campo, Cargando, Encabezado, Insignia, Interruptor, Modal, Segmentos, Selector, Tarjeta, Vacio } from '@/components/ui';
import { Buscador } from '@/components/ui/Buscador';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useToast } from '@/hooks/useToast';
import { modoDemo } from '@/lib/backend';
import { etiqueta, ROLES, tono } from '@/lib/catalogos';
import { MODULOS, nivel, type Modulo } from '@/lib/permisos';
import { TODOS_ITEMS } from '@/components/layout/navegacion';
import type { Perfil, Rol } from '@/lib/types';
import { coincide, nombreDocente } from '@/lib/utils';

export default function Usuarios() {
  const { editar, perfil: yo } = useAuth();
  const puede = editar('usuarios');
  const { data: perfiles, isLoading } = useTabla('perfiles');
  const { data: docentes = [] } = useTabla('docentes');
  const [vista, setVista] = useState<'usuarios' | 'permisos'>('usuarios');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Perfil | null>(null);

  const lista = (perfiles ?? []).filter((p) => coincide(q, p.nombre, p.email)).sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));
  const pendientes = (perfiles ?? []).filter((p) => !p.activo).length;

  const columnas: Columna<Perfil>[] = [
    {
      id: 'nombre',
      titulo: 'Usuario',
      orden: (p) => p.nombre,
      celda: (p) => (
        <div className="flex items-center gap-3">
          <Avatar nombre={p.nombre} />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {p.nombre}
              {p.id === yo?.id && <span className="ml-1.5 text-xs font-normal text-muted">(usted)</span>}
            </p>
            <p className="truncate text-xs text-muted">{p.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'rol', titulo: 'Rol', orden: (p) => p.rol, celda: (p) => <Insignia tono={tono(ROLES, p.rol)}>{etiqueta(ROLES, p.rol)}</Insignia> },
    {
      id: 'doc',
      titulo: 'Docente vinculado',
      ocultarMovil: true,
      celda: (p) => <span className="text-ink-2">{p.docente_id ? nombreDocente(docentes.find((d) => d.id === p.docente_id)) : '—'}</span>,
    },
    {
      id: 'estado',
      titulo: 'Estado',
      orden: (p) => Number(p.activo),
      celda: (p) => (
        <Insignia tono={p.activo ? 'ok' : 'warn'} punto>
          {p.activo ? 'Activo' : 'Pendiente / inactivo'}
        </Insignia>
      ),
    },
    {
      id: 'acc',
      titulo: '',
      className: 'w-12',
      celda: (p) =>
        puede && (
          <Boton variante="fantasma" tam="icono" onClick={(e) => (e.stopPropagation(), setSel(p))} aria-label={`Editar ${p.nombre}`}>
            <Pencil className="size-4" />
          </Boton>
        ),
    },
  ];

  return (
    <>
      <Encabezado
        titulo="Usuarios y roles"
        descripcion="Quién puede ingresar a SIGEI y qué puede hacer cada rol."
        acciones={<Segmentos valor={vista} onCambio={setVista} opciones={[{ valor: 'usuarios', etiqueta: 'Usuarios' }, { valor: 'permisos', etiqueta: 'Permisos por rol' }]} />}
      />

      {vista === 'usuarios' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-info-soft p-4 text-sm text-ink-2 sm:flex-row sm:items-start">
            <Info className="size-5 shrink-0 text-info" />
            <p>
              {modoDemo
                ? 'En modo demo los usuarios se crean al ingresar con cada rol. Con Supabase, las personas solicitan acceso desde la pantalla de ingreso y aquí usted las activa y les asigna un rol.'
                : 'Las personas solicitan acceso desde la pantalla de ingreso. Active su cuenta, asígnele un rol y, si es docente, vincúlela con su registro en el directorio.'}
              {pendientes > 0 && <strong className="ml-1">Hay {pendientes} cuentas esperando activación.</strong>}
            </p>
          </div>
          <Buscador valor={q} onCambio={setQ} placeholder="Buscar usuario" className="mb-4 sm:max-w-sm" />
          {isLoading ? (
            <Cargando />
          ) : (
            <div className="card overflow-hidden">
              <Tabla filas={lista} columnas={columnas} onFila={puede ? setSel : undefined} vacio={<Vacio titulo="Sin usuarios" />} />
            </div>
          )}
        </>
      ) : (
        <MatrizPermisos />
      )}

      <FormUsuario perfil={sel} onCerrar={() => setSel(null)} esYo={sel?.id === yo?.id} />
    </>
  );
}

function MatrizPermisos() {
  const roles: Rol[] = ['admin', 'rector', 'coordinador', 'docente'];
  const nombreModulo = (m: Modulo) => (m === 'inicio' ? 'Inicio' : (TODOS_ITEMS.find((i) => i.modulo === m)?.etiqueta ?? m));
  return (
    <Tarjeta sinRelleno>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted uppercase">Módulo</th>
              {roles.map((r) => (
                <th key={r} className="px-4 py-3 text-center">
                  <Insignia tono={tono(ROLES, r)}>{etiqueta(ROLES, r)}</Insignia>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map((m) => (
              <tr key={m} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-2.5 font-medium">{nombreModulo(m)}</td>
                {roles.map((r) => {
                  const n = nivel(r, m);
                  return (
                    <td key={r} className="px-4 py-2.5 text-center">
                      {n === 'editar' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok">
                          <Check className="size-4" /> Gestiona
                        </span>
                      ) : n === 'ver' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-info">
                          <Eye className="size-4" /> Consulta
                        </span>
                      ) : (
                        <Minus className="mx-auto size-4 text-line-strong" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-muted">
        <ShieldCheck className="size-4" /> Estas reglas también se aplican en la base de datos, no solo en la pantalla. Los docentes pueden radicar sus propias novedades.
      </p>
    </Tarjeta>
  );
}

function FormUsuario({ perfil, onCerrar, esYo }: { perfil: Perfil | null; onCerrar: () => void; esYo: boolean }) {
  const { data: docentes = [] } = useTabla('docentes');
  const { editar } = useMutar('perfiles');
  const toast = useToast();
  const [rol, setRol] = useState<Rol>('docente');
  const [activo, setActivo] = useState(true);
  const [doc, setDoc] = useState('');
  const [previo, setPrevio] = useState<string | null>(null);
  if (perfil && previo !== perfil.id) {
    setPrevio(perfil.id);
    setRol(perfil.rol);
    setActivo(perfil.activo);
    setDoc(perfil.docente_id ?? '');
  }
  if (!perfil) return null;

  const guardar = async () => {
    try {
      await editar.mutateAsync({ id: perfil.id, cambios: { rol, activo, docente_id: doc || null } });
      toast.ok('Usuario actualizado.');
      setPrevio(null);
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto
      onCerrar={() => (setPrevio(null), onCerrar())}
      titulo={perfil.nombre}
      descripcion={perfil.email}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={() => (setPrevio(null), onCerrar())}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={editar.isPending}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Campo etiqueta="Rol" ayuda={esYo ? 'No puede cambiar su propio rol.' : undefined}>
          {(id) => (
            <Selector id={id} value={rol} onChange={(e) => setRol(e.target.value as Rol)} disabled={esYo}>
              {ROLES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <Campo etiqueta="Docente vinculado" ayuda="Permite que la persona vea su horario y radique sus novedades.">
          {(id) => (
            <Selector id={id} value={doc} onChange={(e) => setDoc(e.target.value)}>
              <option value="">Ninguno</option>
              {[...docentes]
                .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.apellidos}, {d.nombres}
                  </option>
                ))}
            </Selector>
          )}
        </Campo>
        {!esYo && <Interruptor activo={activo} onCambio={setActivo} etiqueta="Cuenta activa" descripcion="Si se desactiva, la persona no podrá ingresar." />}
      </div>
    </Modal>
  );
}
