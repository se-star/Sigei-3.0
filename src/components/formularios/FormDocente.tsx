import { useEffect } from 'react';
import { Boton, Campo, Entrada, Panel, Selector, AreaTexto } from '@/components/ui';
import { useFormulario } from '@/hooks/useFormulario';
import { useMutar, useTabla } from '@/hooks/useDatos';
import { useToast } from '@/hooks/useToast';
import { ESTADOS_DOCENTE, VINCULACIONES } from '@/lib/catalogos';
import type { Docente, Nuevo } from '@/lib/types';

const VACIO: Nuevo<Docente> = {
  documento: '',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  fecha_nacimiento: null,
  genero: '',
  area_id: null,
  sede_id: null,
  vinculacion: 'planta',
  escalafon: '',
  cargo: 'Docente de aula',
  estado: 'activo',
  carga_maxima: 22,
  fecha_ingreso: null,
  notas: '',
};

export function FormDocente({
  abierto,
  onCerrar,
  docente,
  onGuardado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  docente?: Docente | null;
  onGuardado?: (d: Docente) => void;
}) {
  const { data: areas = [] } = useTabla('areas');
  const { data: sedes = [] } = useTabla('sedes');
  const { data: docentes = [] } = useTabla('docentes');
  const { crear, editar } = useMutar('docentes');
  const toast = useToast();
  const f = useFormulario<Nuevo<Docente>>(VACIO);

  useEffect(() => {
    if (abierto) f.reiniciar(docente ? { ...VACIO, ...docente } : VACIO);
  }, [abierto, docente]);

  const guardar = async () => {
    const ok = f.validar({
      documento: (v) =>
        !v.documento.trim()
          ? 'Ingrese el documento.'
          : docentes.some((d) => d.documento === v.documento.trim() && d.id !== docente?.id) && 'Ya existe un docente con este documento.',
      nombres: (v) => !v.nombres.trim() && 'Ingrese los nombres.',
      apellidos: (v) => !v.apellidos.trim() && 'Ingrese los apellidos.',
      email: (v) => !!v.email && !/^\S+@\S+\.\S+$/.test(v.email) && 'Correo no válido.',
      carga_maxima: (v) => (Number(v.carga_maxima) < 0 || Number(v.carga_maxima) > 60) && 'Entre 0 y 60 horas.',
    });
    if (!ok) return;
    const datos = {
      ...f.valores,
      documento: f.valores.documento.trim(),
      nombres: f.valores.nombres.trim(),
      apellidos: f.valores.apellidos.trim(),
      email: f.valores.email.trim().toLowerCase(),
      carga_maxima: Number(f.valores.carga_maxima) || 0,
      fecha_nacimiento: f.valores.fecha_nacimiento || null,
      fecha_ingreso: f.valores.fecha_ingreso || null,
      area_id: f.valores.area_id || null,
      sede_id: f.valores.sede_id || null,
    };
    try {
      const r = docente
        ? await editar.mutateAsync({ id: docente.id, cambios: datos })
        : await crear.mutateAsync(datos);
      toast.ok(docente ? 'Datos del docente actualizados.' : 'Docente registrado.');
      onGuardado?.(r as Docente);
      onCerrar();
    } catch (e) {
      toast.error(e);
    }
  };

  const { campo, errores: err, valores: v, set } = f;
  return (
    <Panel
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={docente ? 'Editar docente' : 'Nuevo docente'}
      descripcion="Los campos con * son obligatorios."
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={crear.isPending || editar.isPending}>
            {docente ? 'Guardar cambios' : 'Registrar docente'}
          </Boton>
        </>
      }
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Datos personales</legend>
          <Campo etiqueta="Nombres" requerido error={err.nombres}>
            {(id) => <Entrada id={id} {...campo('nombres')} autoComplete="off" />}
          </Campo>
          <Campo etiqueta="Apellidos" requerido error={err.apellidos}>
            {(id) => <Entrada id={id} {...campo('apellidos')} autoComplete="off" />}
          </Campo>
          <Campo etiqueta="Documento de identidad" requerido error={err.documento}>
            {(id) => <Entrada id={id} {...campo('documento')} inputMode="numeric" />}
          </Campo>
          <Campo etiqueta="Género">
            {(id) => (
              <Selector id={id} value={v.genero} onChange={(e) => set('genero', e.target.value as Docente['genero'])}>
                <option value="">Sin especificar</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="O">Otro</option>
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Fecha de nacimiento">
            {(id) => (
              <Entrada id={id} type="date" value={v.fecha_nacimiento ?? ''} onChange={(e) => set('fecha_nacimiento', e.target.value)} />
            )}
          </Campo>
          <Campo etiqueta="Teléfono">
            {(id) => <Entrada id={id} {...campo('telefono')} type="tel" />}
          </Campo>
          <Campo etiqueta="Correo electrónico" error={err.email} className="sm:col-span-2">
            {(id) => <Entrada id={id} {...campo('email')} type="email" />}
          </Campo>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Vinculación laboral</legend>
          <Campo etiqueta="Cargo">
            {(id) => <Entrada id={id} {...campo('cargo')} />}
          </Campo>
          <Campo etiqueta="Estado">
            {(id) => (
              <Selector id={id} value={v.estado} onChange={(e) => set('estado', e.target.value as Docente['estado'])}>
                {ESTADOS_DOCENTE.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Área">
            {(id) => (
              <Selector id={id} value={v.area_id ?? ''} onChange={(e) => set('area_id', e.target.value || null)}>
                <option value="">Sin área</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Sede">
            {(id) => (
              <Selector id={id} value={v.sede_id ?? ''} onChange={(e) => set('sede_id', e.target.value || null)}>
                <option value="">Sin sede</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Tipo de vinculación">
            {(id) => (
              <Selector id={id} value={v.vinculacion} onChange={(e) => set('vinculacion', e.target.value as Docente['vinculacion'])}>
                {VINCULACIONES.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </Selector>
            )}
          </Campo>
          <Campo etiqueta="Escalafón">
            {(id) => <Entrada id={id} {...campo('escalafon')} placeholder="Ej. 2A, 14" />}
          </Campo>
          <Campo etiqueta="Fecha de ingreso">
            {(id) => <Entrada id={id} type="date" value={v.fecha_ingreso ?? ''} onChange={(e) => set('fecha_ingreso', e.target.value)} />}
          </Campo>
          <Campo etiqueta="Carga máxima semanal (horas)" error={err.carga_maxima}>
            {(id) => (
              <Entrada id={id} type="number" min={0} max={60} value={v.carga_maxima} onChange={(e) => set('carga_maxima', Number(e.target.value))} />
            )}
          </Campo>
        </fieldset>

        <Campo etiqueta="Notas internas">
          {(id) => <AreaTexto id={id} {...campo('notas')} rows={3} />}
        </Campo>
        <button type="submit" hidden />
      </form>
    </Panel>
  );
}
