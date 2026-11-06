import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDown, ArrowUp, Coffee, DatabaseBackup, Download, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { Boton, Campo, Encabezado, Entrada, Segmentos, Tarjeta } from '@/components/ui';
import { useAjustes, useMutar, useTabla, AJUSTES_VACIOS } from '@/hooks/useDatos';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmar } from '@/hooks/useConfirmar';
import { useToast } from '@/hooks/useToast';
import { backend, modoDemo } from '@/lib/backend';
import { reiniciarDemo } from '@/lib/data/local';
import { TABLAS_RESPALDO } from '@/lib/data/provider';
import type { Ajustes, Franja, Tabla, Tablas } from '@/lib/types';
import { cx, descargarArchivo, hoyISO } from '@/lib/utils';

type Pestana = 'institucion' | 'areas' | 'franjas' | 'rubrica' | 'respaldo';

export default function Configuracion() {
  const { editar } = useAuth();
  const puede = editar('configuracion');
  const [p, setP] = useState<Pestana>('institucion');
  return (
    <>
      <Encabezado titulo="Configuración" descripcion="Datos de la institución, catálogos académicos, horario base y respaldos." />
      <Segmentos<Pestana>
        className="mb-6"
        valor={p}
        onCambio={setP}
        opciones={[
          { valor: 'institucion', etiqueta: 'Institución' },
          { valor: 'areas', etiqueta: 'Áreas y asignaturas' },
          { valor: 'franjas', etiqueta: 'Franjas horarias' },
          { valor: 'rubrica', etiqueta: 'Rúbrica de seguimiento' },
          { valor: 'respaldo', etiqueta: 'Respaldo' },
        ]}
      />
      <fieldset disabled={!puede} className="min-w-0">
        {p === 'institucion' && <Institucion />}
        {p === 'areas' && <Areas />}
        {p === 'franjas' && <Franjas />}
        {p === 'rubrica' && <Rubrica />}
        {p === 'respaldo' && <Respaldo />}
      </fieldset>
    </>
  );
}

/** Guarda la fila única de ajustes (la crea si no existe). */
function useGuardarAjustes() {
  const { data } = useTabla('ajustes');
  const { crear, editar } = useMutar('ajustes');
  const toast = useToast();
  return {
    pendiente: crear.isPending || editar.isPending,
    guardar: async (cambios: Partial<Ajustes>) => {
      try {
        const fila = data?.[0];
        if (fila) await editar.mutateAsync({ id: fila.id, cambios });
        else await crear.mutateAsync({ ...AJUSTES_VACIOS, ...cambios, id: 'ajustes' });
        toast.ok('Configuración guardada.');
      } catch (e) {
        toast.error(e);
      }
    },
  };
}

function Institucion() {
  const ajustes = useAjustes();
  const { guardar, pendiente } = useGuardarAjustes();
  const [v, setV] = useState(ajustes);
  useEffect(() => setV(ajustes), [ajustes.id, ajustes.updated_at]);
  const campo = (k: keyof Ajustes, t: string, extra?: { tipo?: string; col?: boolean; ayuda?: string }) => (
    <Campo etiqueta={t} className={extra?.col ? 'sm:col-span-2' : undefined} ayuda={extra?.ayuda}>
      {(id) => (
        <Entrada
          id={id}
          type={extra?.tipo ?? 'text'}
          value={String(v[k] ?? '')}
          onChange={(e) => setV({ ...v, [k]: extra?.tipo === 'number' ? Number(e.target.value) : e.target.value })}
        />
      )}
    </Campo>
  );
  return (
    <Tarjeta titulo="Datos institucionales" className="max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        {campo('institucion', 'Nombre de la institución', { col: true })}
        {campo('sigla', 'Sigla')}
        {campo('municipio', 'Municipio')}
        {campo('codigo_dane', 'Código DANE')}
        {campo('nit', 'NIT')}
        {campo('rector', 'Rector(a)')}
        {campo('anio_lectivo', 'Año lectivo', { tipo: 'number' })}
        {campo('periodos', 'Número de períodos académicos', { tipo: 'number' })}
      </div>
      <div className="mt-6 flex justify-end">
        <Boton icono={<Save className="size-4" />} cargando={pendiente} onClick={() => guardar({ ...v, id: undefined } as Partial<Ajustes>)}>
          Guardar cambios
        </Boton>
      </div>
    </Tarjeta>
  );
}

function Areas() {
  const { data: areas = [] } = useTabla('areas');
  const { data: asignaturas = [] } = useTabla('asignaturas');
  const { data: asignaciones = [] } = useTabla('asignaciones');
  const mA = useMutar('areas');
  const mS = useMutar('asignaturas');
  const confirmar = useConfirmar();
  const toast = useToast();
  const [nuevaArea, setNuevaArea] = useState('');
  const [nuevas, setNuevas] = useState<Record<string, string>>({});

  const correr = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.ok(ok);
    } catch (e) {
      toast.error(e);
    }
  };
  const colores = ['#0f766e', '#b45309', '#15803d', '#7c3aed', '#1d4ed8', '#db2777', '#c2410c', '#64748b'];

  return (
    <div className="flex flex-col gap-4">
      <form
        className="card flex flex-col gap-2 p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nuevaArea.trim()) return;
          correr(() => mA.crear.mutateAsync({ nombre: nuevaArea.trim(), color: colores[areas.length % colores.length] }), 'Área creada.');
          setNuevaArea('');
        }}
      >
        <Entrada value={nuevaArea} onChange={(e) => setNuevaArea(e.target.value)} placeholder="Nombre de la nueva área" aria-label="Nueva área" />
        <Boton type="submit" icono={<Plus className="size-4" />}>
          Agregar área
        </Boton>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        {areas.map((a) => {
          const suyas = asignaturas.filter((s) => s.area_id === a.id);
          return (
            <Tarjeta
              key={a.id}
              titulo={
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={a.color}
                    onChange={(e) => mA.editar.mutate({ id: a.id, cambios: { color: e.target.value } })}
                    className="size-6 cursor-pointer rounded-md border-0 bg-transparent p-0"
                    aria-label={`Color de ${a.nombre}`}
                  />
                  {a.nombre}
                </span>
              }
              accion={
                <Boton
                  variante="fantasma"
                  tam="icono"
                  aria-label={`Eliminar área ${a.nombre}`}
                  onClick={async () => {
                    if (suyas.length) return toast.error('Primero elimine o mueva las asignaturas de esta área.');
                    if (await confirmar({ titulo: `Eliminar ${a.nombre}`, confirmar: 'Eliminar', peligro: true })) correr(() => mA.eliminar.mutateAsync(a.id), 'Área eliminada.');
                  }}
                >
                  <Trash2 className="size-4" />
                </Boton>
              }
            >
              <ul className="mb-3 flex flex-wrap gap-2">
                {suyas.map((s) => {
                  const usos = asignaciones.filter((x) => x.asignatura_id === s.id).length;
                  return (
                    <li key={s.id} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-sm">
                      {s.nombre}
                      <button
                        className="grid size-5 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                        aria-label={`Eliminar ${s.nombre}`}
                        onClick={async () => {
                          if (usos) return toast.error(`${s.nombre} tiene ${usos} asignaciones. Quítelas antes de eliminarla.`);
                          correr(() => mS.eliminar.mutateAsync(s.id), 'Asignatura eliminada.');
                        }}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
                {!suyas.length && <li className="text-sm text-muted">Sin asignaturas.</li>}
              </ul>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = (nuevas[a.id] ?? '').trim();
                  if (!n) return;
                  correr(() => mS.crear.mutateAsync({ nombre: n, area_id: a.id }));
                  setNuevas({ ...nuevas, [a.id]: '' });
                }}
              >
                <Entrada value={nuevas[a.id] ?? ''} onChange={(e) => setNuevas({ ...nuevas, [a.id]: e.target.value })} placeholder="Nueva asignatura" className="h-9" aria-label={`Nueva asignatura en ${a.nombre}`} />
                <Boton type="submit" variante="secundario" tam="sm" className="h-9">
                  Agregar
                </Boton>
              </form>
            </Tarjeta>
          );
        })}
      </div>
    </div>
  );
}

function Franjas() {
  const ajustes = useAjustes();
  const { guardar, pendiente } = useGuardarAjustes();
  const [lista, setLista] = useState<Franja[]>(ajustes.franjas);
  useEffect(() => setLista(ajustes.franjas), [ajustes.franjas]);
  const upd = (i: number, f: Partial<Franja>) => setLista(lista.map((x, j) => (j === i ? { ...x, ...f } : x)));
  const errores = lista.map((f, i) => (f.inicio >= f.fin ? 'Inicio debe ser antes del fin' : i > 0 && f.inicio < lista[i - 1].fin ? 'Se cruza con la anterior' : ''));
  const mover = (i: number, d: number) => {
    const n = [...lista];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setLista(n);
  };

  return (
    <Tarjeta titulo="Franjas de la jornada" className="max-w-3xl">
      <p className="mb-4 text-sm text-muted">Estas franjas forman las filas de la cuadrícula de horarios. Marque los descansos para que se muestren como separadores.</p>
      <ul className="flex flex-col gap-2">
        {lista.map((f, i) => (
          <li key={i} className={cx('flex flex-wrap items-center gap-2 rounded-xl border p-2', errores[i] ? 'border-danger/50 bg-danger-soft/40' : 'border-line')}>
            <span className="w-7 text-center text-sm font-bold text-muted tabular-nums">{f.descanso ? <Coffee className="mx-auto size-4" /> : lista.slice(0, i + 1).filter((x) => !x.descanso).length}</span>
            <Entrada type="time" value={f.inicio} onChange={(e) => upd(i, { inicio: e.target.value })} className="h-9 w-32" aria-label="Inicio" />
            <span className="text-muted">a</span>
            <Entrada type="time" value={f.fin} onChange={(e) => upd(i, { fin: e.target.value })} className="h-9 w-32" aria-label="Fin" />
            <label className="ml-2 flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={!!f.descanso} onChange={(e) => upd(i, { descanso: e.target.checked })} className="size-4 accent-[var(--brand)]" />
              Descanso
            </label>
            {errores[i] && <span className="text-xs font-semibold text-danger">{errores[i]}</span>}
            <span className="ml-auto flex">
              <Boton variante="fantasma" tam="icono" className="size-8" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                <ArrowUp className="size-4" />
              </Boton>
              <Boton variante="fantasma" tam="icono" className="size-8" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar">
                <ArrowDown className="size-4" />
              </Boton>
              <Boton variante="fantasma" tam="icono" className="size-8" onClick={() => setLista(lista.filter((_, j) => j !== i))} aria-label="Quitar franja">
                <Trash2 className="size-4" />
              </Boton>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Boton
          variante="secundario"
          icono={<Plus className="size-4" />}
          onClick={() => {
            const ult = lista[lista.length - 1];
            const ini = ult?.fin ?? '07:00';
            const [h, m] = ini.split(':').map(Number);
            const fin = new Date(0, 0, 0, h, m + 55);
            setLista([...lista, { inicio: ini, fin: `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}` }]);
          }}
        >
          Agregar franja
        </Boton>
        <Boton icono={<Save className="size-4" />} cargando={pendiente} disabled={errores.some(Boolean)} onClick={() => guardar({ franjas: lista })}>
          Guardar franjas
        </Boton>
      </div>
    </Tarjeta>
  );
}

function Rubrica() {
  const ajustes = useAjustes();
  const { guardar, pendiente } = useGuardarAjustes();
  const [lista, setLista] = useState(ajustes.criterios_seguimiento);
  const [nuevo, setNuevo] = useState('');
  useEffect(() => setLista(ajustes.criterios_seguimiento), [ajustes.criterios_seguimiento]);
  return (
    <Tarjeta titulo="Criterios de la rúbrica" className="max-w-2xl">
      <p className="mb-4 text-sm text-muted">Cada criterio se valora de 1 (inicial) a 4 (destacado) en los seguimientos nuevos. Los registros anteriores conservan sus criterios.</p>
      <ul className="flex flex-col gap-2">
        {lista.map((c, i) => (
          <li key={i} className="flex gap-2">
            <Entrada value={c} onChange={(e) => setLista(lista.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Criterio ${i + 1}`} />
            <Boton variante="fantasma" tam="icono" className="size-10" onClick={() => setLista(lista.filter((_, j) => j !== i))} aria-label="Quitar criterio">
              <Trash2 className="size-4" />
            </Boton>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nuevo.trim()) setLista([...lista, nuevo.trim()]);
          setNuevo('');
        }}
      >
        <Entrada value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nuevo criterio" aria-label="Nuevo criterio" />
        <Boton type="submit" variante="secundario">
          Agregar
        </Boton>
      </form>
      <div className="mt-5 flex justify-end">
        <Boton icono={<Save className="size-4" />} cargando={pendiente} onClick={() => guardar({ criterios_seguimiento: lista.map((x) => x.trim()).filter(Boolean) })}>
          Guardar rúbrica
        </Boton>
      </div>
    </Tarjeta>
  );
}

function Respaldo() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirmar = useConfirmar();
  const archivo = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState(false);

  const exportar = async () => {
    setTrabajando(true);
    try {
      const datos: Record<string, unknown> = { sigei: '3.0', exportado: new Date().toISOString() };
      for (const t of TABLAS_RESPALDO) datos[t] = await backend.datos.list(t);
      descargarArchivo(`sigei-respaldo-${hoyISO()}.json`, JSON.stringify(datos, null, 2), 'application/json');
      toast.ok('Respaldo descargado.');
    } catch (e) {
      toast.error(e);
    } finally {
      setTrabajando(false);
    }
  };

  const importar = async (f: File) => {
    let datos: Record<string, unknown>;
    try {
      datos = JSON.parse(await f.text());
      if (datos.sigei !== '3.0') throw new Error();
    } catch {
      return toast.error('El archivo no es un respaldo válido de SIGEI 3.0.');
    }
    const resumen = TABLAS_RESPALDO.filter((t) => Array.isArray(datos[t])).map((t) => `${(datos[t] as unknown[]).length} ${t}`);
    const ok = await confirmar({
      titulo: 'Restaurar respaldo',
      texto: `Se agregarán o actualizarán: ${resumen.join(', ')}. Los registros con el mismo identificador se sobrescriben.`,
      confirmar: 'Restaurar',
    });
    if (!ok) return;
    setTrabajando(true);
    try {
      for (const t of TABLAS_RESPALDO) if (Array.isArray(datos[t])) await backend.datos.bulkUpsert(t as Tabla, datos[t] as Tablas[Tabla][]);
      await qc.invalidateQueries();
      toast.ok('Respaldo restaurado.');
    } catch (e) {
      toast.error(e);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="grid max-w-4xl gap-4 md:grid-cols-2">
      <Tarjeta titulo="Descargar respaldo" icono={<Download className="size-4" />}>
        <p className="mb-4 text-sm text-muted">Guarda toda la información institucional en un archivo JSON. Recomendado al cierre de cada período.</p>
        <Boton icono={<DatabaseBackup className="size-4" />} onClick={exportar} cargando={trabajando}>
          Descargar respaldo
        </Boton>
      </Tarjeta>
      <Tarjeta titulo="Restaurar respaldo" icono={<Upload className="size-4" />}>
        <p className="mb-4 text-sm text-muted">Carga un archivo generado por SIGEI 3.0. Los usuarios y el registro de actividad no se incluyen.</p>
        <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={(e) => (e.target.files?.[0] && importar(e.target.files[0]), (e.target.value = ''))} />
        <Boton variante="secundario" icono={<Upload className="size-4" />} onClick={() => archivo.current?.click()} cargando={trabajando}>
          Elegir archivo
        </Boton>
      </Tarjeta>
      {modoDemo && (
        <Tarjeta titulo="Datos de demostración" icono={<AlertTriangle className="size-4" />} className="md:col-span-2">
          <p className="mb-4 text-sm text-muted">Restablece los datos de ejemplo del modo demo. Se perderán los cambios hechos en este navegador.</p>
          <Boton
            variante="peligro"
            icono={<RotateCcw className="size-4" />}
            onClick={async () => {
              if (!(await confirmar({ titulo: 'Restablecer datos de demostración', confirmar: 'Restablecer', peligro: true }))) return;
              reiniciarDemo();
              await qc.invalidateQueries();
              toast.ok('Datos de demostración restablecidos.');
            }}
          >
            Restablecer demo
          </Boton>
        </Tarjeta>
      )}
    </div>
  );
}
