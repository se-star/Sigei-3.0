import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Landmark, MapPin, Pencil, Plus, ShieldPlus, Trash2 } from 'lucide-react';
import { Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Interruptor, Modal, Selector, Vacio } from '@/components/ui';
import { Buscador } from '@/components/ui/Buscador';
import { useAuth } from '@/hooks/useAuth';
import { AJUSTES_VACIOS, useMutar, useMutarMiembros, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { backend } from '@/lib/backend';
import { ROLES } from '@/lib/catalogos';
import type { Institucion, Rol } from '@/lib/types';
import { abreviatura, coincide, cx } from '@/lib/utils';

/** Panel de la plataforma: solo para el superadministrador. */
export default function Instituciones() {
  const { perfil, cambiarInstitucion, refrescar } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const confirmar = useConfirmar();
  const { data: instituciones, isLoading } = useTabla('instituciones');
  const { eliminar } = useMutar('instituciones');
  const { data: resumen = [] } = useQuery({
    queryKey: ['resumen-instituciones'],
    queryFn: () => backend.datos.resumenInstituciones(),
    staleTime: 30_000,
  });
  const [q, setQ] = useState('');
  const [form, setForm] = useState<{ abierto: boolean; inst?: Institucion }>({ abierto: false });
  const [admins, setAdmins] = useState<Institucion | null>(null);

  const datos = (id: string) => resumen.find((r) => r.institucion_id === id);
  const lista = (instituciones ?? []).filter((i) => coincide(q, i.nombre, i.sigla, i.municipio)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const total = (k: 'docentes' | 'estudiantes' | 'usuarios' | 'pendientes') => resumen.reduce((s, r) => s + r[k], 0);

  const entrar = async (i: Institucion) => {
    try {
      await cambiarInstitucion(i.id);
      nav('/');
      toast.ok(`Ahora trabaja en ${i.nombre}.`);
    } catch (e) {
      toast.error(e);
    }
  };

  const borrar = async (i: Institucion) => {
    const d = datos(i.id);
    const ok = await confirmar({
      titulo: `Eliminar ${i.nombre}`,
      texto: `Se borrarán de forma permanente todos sus datos${d ? ` (${d.docentes} docentes, ${d.grupos} grupos)` : ''} y el acceso de sus ${d?.usuarios ?? 0} usuarios. Si solo quiere pausarla, desactívela en lugar de eliminarla. Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar definitivamente',
      peligro: true,
    });
    if (!ok) return;
    try {
      await eliminar.mutateAsync(i.id);
      await refrescar();
      toast.ok('Institución eliminada.');
    } catch (e) {
      toast.error(e);
    }
  };

  if (!perfil?.es_superadmin) return null;

  return (
    <>
      <Encabezado
        titulo="Instituciones"
        descripcion="Todas las instituciones de la plataforma. Cree nuevas, nombre a sus administradores y entre a cualquiera para trabajar en ella."
        acciones={
          <Boton icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })}>
            Nueva institución
          </Boton>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ['Instituciones', instituciones?.length ?? 0],
            ['Docentes activos', total('docentes')],
            ['Estudiantes', total('estudiantes')],
            ['Solicitudes de acceso', total('pendientes')],
          ] as const
        ).map(([t, v]) => (
          <div key={t} className="card p-5">
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{v.toLocaleString('es-CO')}</p>
            <p className="text-sm text-muted">{t}</p>
          </div>
        ))}
      </div>

      {(instituciones?.length ?? 0) > 6 && <Buscador valor={q} onCambio={setQ} placeholder="Buscar institución" className="mb-4 sm:max-w-sm" />}

      {isLoading ? (
        <Cargando />
      ) : !lista.length ? (
        <div className="card">
          <Vacio
            icono={<Landmark className="size-6" />}
            titulo={instituciones?.length ? 'Ninguna coincide' : 'Aún no hay instituciones'}
            texto={instituciones?.length ? undefined : 'Cree la primera institución para empezar.'}
            accion={!instituciones?.length && <Boton onClick={() => setForm({ abierto: true })}>Nueva institución</Boton>}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((i) => {
            const d = datos(i.id);
            const actual = i.id === perfil.institucion_id;
            return (
              <article key={i.id} className={cx('card flex flex-col p-6', !i.activa && 'opacity-70')}>
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2 font-semibold">{abreviatura(i)}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[17px] leading-snug font-semibold">{i.nombre}</h2>
                    {i.municipio && (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                        <MapPin className="size-3.5" />
                        {i.municipio}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {actual && <Insignia tono="lime">Trabajando aquí</Insignia>}
                      {!i.activa && <Insignia tono="warn">Desactivada</Insignia>}
                      {!!d?.pendientes && <Insignia tono="info">{d.pendientes} por activar</Insignia>}
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-2 rounded-[20px] bg-surface-2 p-3 text-center">
                  {(
                    [
                      ['Docentes', d?.docentes ?? 0],
                      ['Estudiantes', d?.estudiantes ?? 0],
                      ['Usuarios', d?.usuarios ?? 0],
                    ] as const
                  ).map(([t, v]) => (
                    <div key={t}>
                      <dd className="text-lg font-semibold tabular-nums">{v.toLocaleString('es-CO')}</dd>
                      <dt className="text-xs text-muted">{t}</dt>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex items-center gap-1">
                  <Boton tam="sm" onClick={() => entrar(i)} disabled={actual} icono={<ArrowRight className="size-3.5" />}>
                    {actual ? 'Actual' : 'Entrar'}
                  </Boton>
                  <Boton tam="sm" variante="secundario" onClick={() => setAdmins(i)} icono={<ShieldPlus className="size-3.5" />}>
                    Administrador
                  </Boton>
                  <span className="ml-auto flex">
                    <Boton variante="fantasma" tam="icono" onClick={() => setForm({ abierto: true, inst: i })} aria-label={`Editar ${i.nombre}`}>
                      <Pencil className="size-4" />
                    </Boton>
                    <Boton variante="fantasma" tam="icono" onClick={() => borrar(i)} aria-label={`Eliminar ${i.nombre}`}>
                      <Trash2 className="size-4" />
                    </Boton>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <FormInstitucion {...form} onCerrar={() => setForm({ abierto: false })} />
      <NombrarAdministrador inst={admins} onCerrar={() => setAdmins(null)} />
    </>
  );
}

function FormInstitucion({ abierto, inst, onCerrar }: { abierto: boolean; inst?: Institucion; onCerrar: () => void }) {
  const { crear, editar } = useMutar('instituciones');
  const { refrescar } = useAuth();
  const toast = useToast();
  const [v, setV] = useState({ nombre: '', sigla: '', municipio: '', activa: true });
  useEffect(() => {
    if (abierto) setV(inst ? { nombre: inst.nombre, sigla: inst.sigla, municipio: inst.municipio, activa: inst.activa } : { nombre: '', sigla: '', municipio: '', activa: true });
  }, [abierto, inst]);

  const guardar = async () => {
    if (!v.nombre.trim()) return toast.error('Escriba el nombre de la institución.');
    const datos = { ...v, nombre: v.nombre.trim(), sigla: v.sigla.trim().toUpperCase(), municipio: v.municipio.trim() };
    try {
      if (inst) await editar.mutateAsync({ id: inst.id, cambios: datos });
      else {
        const { id: _id, ...base } = AJUSTES_VACIOS;
        void _id;
        await crear.mutateAsync({ ...base, ...datos });
      }
      await refrescar();
      toast.ok(inst ? 'Institución actualizada.' : 'Institución creada. Ahora nombre a su administrador.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={inst ? 'Editar institución' : 'Nueva institución'}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending}>
            {inst ? 'Guardar' : 'Crear institución'}
          </Boton>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => (e.preventDefault(), guardar())}>
        <Campo etiqueta="Nombre" requerido>
          {(id) => <Entrada id={id} value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} placeholder="Institución Educativa…" />}
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Sigla">
            {(id) => <Entrada id={id} value={v.sigla} onChange={(e) => setV({ ...v, sigla: e.target.value })} placeholder="IEXX" />}
          </Campo>
          <Campo etiqueta="Municipio">
            {(id) => <Entrada id={id} value={v.municipio} onChange={(e) => setV({ ...v, municipio: e.target.value })} />}
          </Campo>
        </div>
        {inst && (
          <Interruptor
            activo={v.activa}
            onCambio={(x) => setV({ ...v, activa: x })}
            etiqueta="Institución activa"
            descripcion="Si se desactiva, sus usuarios no pueden entrar y no aparece al solicitar acceso. Los datos se conservan."
          />
        )}
        {!inst && <p className="text-sm text-muted">Los demás datos (DANE, NIT, franjas horarias, rúbrica) los completa su administrador en Configuración.</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function NombrarAdministrador({ inst, onCerrar }: { inst: Institucion | null; onCerrar: () => void }) {
  const { agregar } = useMutarMiembros();
  const toast = useToast();
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<Rol>('admin');
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    setCorreo('');
    setRol('admin');
    setAviso('');
  }, [inst]);
  if (!inst) return null;

  const enviar = async () => {
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) return setAviso('Escriba un correo válido.');
    setAviso('');
    try {
      const r = await agregar.mutateAsync({ correo: correo.trim(), rol, institucionId: inst.id });
      if (r === 'no_registrado') {
        setAviso(`Ese correo aún no tiene cuenta. Pídale que use “Solicitar acceso” y elija ${inst.nombre}; después vuelva aquí y agréguelo, o actívelo desde Usuarios y roles de esa institución.`);
        return;
      }
      toast.ok(`Listo: ${correo.trim()} ya tiene acceso a ${inst.nombre}.`);
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Nombrar administrador"
      descripcion={inst.nombre}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={agregar.isPending}>
            Dar acceso
          </Boton>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => (e.preventDefault(), enviar())}>
        <Campo etiqueta="Correo de la persona" requerido error={aviso || undefined} ayuda="Debe tener cuenta en SIGEI.">
          {(id) => <Entrada id={id} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="rectoria@colegio.edu.co" />}
        </Campo>
        <Campo etiqueta="Rol">
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
