import { useEffect, useState } from 'react';
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Star, Trash2 } from 'lucide-react';
import { Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Interruptor, Modal, Vacio } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { backend } from '@/lib/backend';
import { useQueryClient } from '@tanstack/react-query';
import type { Nuevo, Sede } from '@/lib/types';

export default function Sedes() {
  const { editar } = useAuth();
  const puede = editar('sedes');
  const { data: sedes, isLoading } = useTabla('sedes');
  const { data: docentes = [] } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { eliminar } = useMutar('sedes');
  const confirmar = useConfirmar();
  const toast = useToast();
  const [form, setForm] = useState<{ abierto: boolean; sede?: Sede }>({ abierto: false });

  const borrar = async (s: Sede) => {
    const usos = docentes.filter((d) => d.sede_id === s.id).length + grupos.filter((g) => g.sede_id === s.id).length;
    const ok = await confirmar({
      titulo: `Eliminar ${s.nombre}`,
      texto: usos ? `Hay ${usos} docentes o grupos asociados a esta sede; quedarán sin sede. ¿Continuar?` : '¿Eliminar esta sede?',
      confirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await eliminar.mutateAsync(s.id);
      toast.ok('Sede eliminada.');
    } catch (e) {
      toast.error(e);
    }
  };

  const lista = [...(sedes ?? [])].sort((a, b) => Number(b.principal) - Number(a.principal) || a.nombre.localeCompare(b.nombre));
  return (
    <>
      <Encabezado
        titulo="Sedes"
        descripcion="Sedes de la institución, con sus datos de contacto."
        acciones={
          puede && (
            <Boton icono={<Plus className="size-4" />} onClick={() => setForm({ abierto: true })}>
              Nueva sede
            </Boton>
          )
        }
      />
      {isLoading ? (
        <Cargando />
      ) : !lista.length ? (
        <div className="card">
          <Vacio icono={<Building2 className="size-6" />} titulo="Sin sedes registradas" accion={puede && <Boton onClick={() => setForm({ abierto: true })}>Agregar sede</Boton>} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((s) => {
            const nd = docentes.filter((d) => d.sede_id === s.id && d.estado === 'activo').length;
            const sg = grupos.filter((g) => g.sede_id === s.id);
            return (
              <article key={s.id} className="card flex flex-col p-5">
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold">{s.nombre}</h2>
                    {s.principal && (
                      <Insignia tono="lime">
                        <Star className="size-3" /> Principal
                      </Insignia>
                    )}
                  </div>
                  {puede && (
                    <div className="flex">
                      <Boton variante="fantasma" tam="icono" onClick={() => setForm({ abierto: true, sede: s })} aria-label={`Editar ${s.nombre}`}>
                        <Pencil className="size-4" />
                      </Boton>
                      <Boton variante="fantasma" tam="icono" onClick={() => borrar(s)} aria-label={`Eliminar ${s.nombre}`}>
                        <Trash2 className="size-4" />
                      </Boton>
                    </div>
                  )}
                </div>
                <ul className="flex flex-col gap-2 text-sm text-ink-2">
                  {s.direccion && (
                    <li className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted" />
                      {s.direccion}
                    </li>
                  )}
                  {s.telefono && (
                    <li className="flex items-center gap-2">
                      <Phone className="size-4 text-muted" />
                      {s.telefono}
                    </li>
                  )}
                  {s.email && (
                    <li className="flex items-center gap-2">
                      <Mail className="size-4 text-muted" />
                      {s.email}
                    </li>
                  )}
                </ul>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                  {[
                    [nd, 'docentes'],
                    [sg.length, 'grupos'],
                    [sg.reduce((a, g) => a + g.estudiantes, 0), 'estudiantes'],
                  ].map(([v, t]) => (
                    <div key={t}>
                      <p className="font-display text-xl font-bold tabular-nums">{v}</p>
                      <p className="text-xs text-muted">{t}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <FormSede {...form} sedes={lista} onCerrar={() => setForm({ abierto: false })} />
    </>
  );
}

function FormSede({ abierto, sede, sedes, onCerrar }: { abierto: boolean; sede?: Sede; sedes: Sede[]; onCerrar: () => void }) {
  const { crear, editar } = useMutar('sedes');
  const qc = useQueryClient();
  const toast = useToast();
  const vacio: Nuevo<Sede> = { nombre: '', direccion: '', telefono: '', email: '', principal: false };
  const [v, setV] = useState(vacio);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  useEffect(() => {
    if (abierto) setV(sede ? { ...sede } : { ...vacio, principal: sedes.length === 0 });
  }, [abierto, sede]);

  const guardar = async () => {
    if (!v.nombre.trim()) return toast.error('Escriba el nombre de la sede.');
    try {
      const datos = { ...v, nombre: v.nombre.trim() };
      const r = sede ? await editar.mutateAsync({ id: sede.id, cambios: datos }) : await crear.mutateAsync(datos);
      // Solo una sede puede ser la principal.
      if (datos.principal)
        for (const s of sedes.filter((x) => x.principal && x.id !== r.id)) await backend.datos.update('sedes', s.id, { principal: false });
      qc.invalidateQueries({ queryKey: ['tabla', 'sedes'] });
      toast.ok(sede ? 'Sede actualizada.' : 'Sede creada.');
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={sede ? 'Editar sede' : 'Nueva sede'}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Nombre" requerido>
          {(id) => <Entrada id={id} value={v.nombre} onChange={(e) => set('nombre', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Dirección">
          {(id) => <Entrada id={id} value={v.direccion} onChange={(e) => set('direccion', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Teléfono">
          {(id) => <Entrada id={id} type="tel" value={v.telefono} onChange={(e) => set('telefono', e.target.value)} />}
        </Campo>
        <Campo etiqueta="Correo">
          {(id) => <Entrada id={id} type="email" value={v.email} onChange={(e) => set('email', e.target.value)} />}
        </Campo>
        <Interruptor activo={v.principal} onCambio={(x) => set('principal', x)} etiqueta="Sede principal" />
      </div>
    </Modal>
  );
}
