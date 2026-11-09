import { useState } from 'react';
import { Check, Info, Minus, Pencil, ShieldCheck, Eye, UserPlus, UserMinus } from 'lucide-react';
import { Avatar, Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Interruptor, Modal, Segmentos, Selector, Tarjeta, Vacio } from '@/components/ui';
import { Buscador } from '@/components/ui/Buscador';
import { Tabla, type Columna } from '@/components/ui/Tabla';
import { useAuth } from '@/hooks/useAuth';
import { useAjustes, useMiembros, useMutarMiembros, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { modoDemo } from '@/lib/backend';
import { etiqueta, ROLES, tono } from '@/lib/catalogos';
import { MODULOS, nivel, type Modulo } from '@/lib/permisos';
import { TODOS_ITEMS } from '@/components/layout/navegacion';
import type { Miembro, Rol } from '@/lib/types';
import { coincide, nombreDocente } from '@/lib/utils';

export default function Usuarios() {
  const { editar, perfil: yo } = useAuth();
  const puede = editar('usuarios');
  const ajustes = useAjustes();
  const { data: perfiles, isLoading } = useMiembros();
  const { data: docentes = [] } = useTabla('docentes');
  const [vista, setVista] = useState<'usuarios' | 'permisos'>('usuarios');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Miembro | null>(null);
  const [agregar, setAgregar] = useState(false);

  const lista = (perfiles ?? []).filter((p) => coincide(q, p.nombre, p.email)).sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));
  const pendientes = (perfiles ?? []).filter((p) => !p.activo).length;

  const columnas: Columna<Miembro>[] = [
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
        descripcion={`Quién puede ingresar a ${ajustes.sigla || ajustes.nombre} y qué puede hacer cada rol.`}
        acciones={
          <>
            <Segmentos valor={vista} onCambio={setVista} opciones={[{ valor: 'usuarios', etiqueta: 'Usuarios' }, { valor: 'permisos', etiqueta: 'Permisos por rol' }]} />
            {puede && vista === 'usuarios' && (
              <Boton icono={<UserPlus className="size-4" />} onClick={() => setAgregar(true)}>
                Agregar persona
              </Boton>
            )}
          </>
        }
      />

      {vista === 'usuarios' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-info-soft p-4 text-sm text-ink-2 sm:flex-row sm:items-start">
            <Info className="size-5 shrink-0 text-info" />
            <p>
              {modoDemo
                ? 'En modo demo los usuarios se crean al ingresar con cada rol. Con Supabase, las personas solicitan acceso a esta institución desde la pantalla de ingreso y aquí usted las activa y les asigna un rol.'
                : 'Las personas solicitan acceso a esta institución desde la pantalla de ingreso, o usted las agrega por correo si ya tienen cuenta en SIGEI. Una misma persona puede tener un rol distinto en cada institución.'}
              {pendientes > 0 && <strong className="ml-1">Hay {pendientes} solicitudes esperando activación.</strong>}
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
      <AgregarPersona abierto={agregar} onCerrar={() => setAgregar(false)} />
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

function FormUsuario({ perfil, onCerrar, esYo }: { perfil: Miembro | null; onCerrar: () => void; esYo: boolean }) {
  const { data: docentes = [] } = useTabla('docentes');
  const { actualizar, quitar } = useMutarMiembros();
  const confirmar = useConfirmar();
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
  const cerrar = () => (setPrevio(null), onCerrar());

  const guardar = async () => {
    try {
      await actualizar.mutateAsync({ id: perfil.id, cambios: { rol, activo, docente_id: doc || null } });
      toast.ok(perfil.activo || !activo ? 'Usuario actualizado.' : `${perfil.nombre} ya puede ingresar.`);
      cerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  const retirar = async () => {
    const ok = await confirmar({
      titulo: 'Quitar de la institución',
      texto: `${perfil.nombre} dejará de tener acceso a esta institución. Su cuenta y su acceso a otras instituciones se conservan.`,
      confirmar: 'Quitar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await quitar.mutateAsync(perfil.id);
      toast.ok('Persona retirada de la institución.');
      cerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto
      onCerrar={cerrar}
      titulo={perfil.nombre}
      descripcion={perfil.email}
      ancho="sm"
      pie={
        <>
          {!esYo && (
            <Boton variante="fantasma" className="mr-auto text-danger hover:bg-danger-soft" icono={<UserMinus className="size-4" />} onClick={retirar}>
              Quitar
            </Boton>
          )}
          <Boton variante="secundario" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={actualizar.isPending}>
            {!perfil.activo && activo ? 'Activar' : 'Guardar'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Campo etiqueta="Rol en esta institución" ayuda={esYo ? 'No puede cambiar su propio rol.' : undefined}>
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
        <Campo etiqueta="Docente vinculado" ayuda="Permite que la persona vea su horario y radique sus novedades en esta institución.">
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
        {!esYo && <Interruptor activo={activo} onCambio={setActivo} etiqueta="Acceso activo" descripcion="Si se desactiva, la persona no podrá entrar a esta institución." />}
      </div>
    </Modal>
  );
}

function AgregarPersona({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { agregar } = useMutarMiembros();
  const toast = useToast();
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<Rol>('docente');
  const [aviso, setAviso] = useState('');

  const enviar = async () => {
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) return setAviso('Escriba un correo válido.');
    setAviso('');
    try {
      const r = await agregar.mutateAsync({ correo: correo.trim(), rol });
      if (r === 'no_registrado') {
        setAviso('Ese correo aún no tiene cuenta en SIGEI. Pídale que use “Solicitar acceso” y elija esta institución; luego actívela aquí.');
        return;
      }
      toast.ok('Persona agregada a la institución.');
      setCorreo('');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Agregar persona"
      descripcion="Para quien ya tiene cuenta en SIGEI (por ejemplo, porque trabaja en otra institución)."
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={agregar.isPending}>
            Agregar
          </Boton>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => (e.preventDefault(), enviar())}>
        <Campo etiqueta="Correo electrónico" requerido error={aviso || undefined}>
          {(id) => <Entrada id={id} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@colegio.edu.co" />}
        </Campo>
        <Campo etiqueta="Rol en esta institución">
          {(id) => (
            <Selector id={id} value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
              {ROLES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </option>
              ))}
            </Selector>
          )}
        </Campo>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
