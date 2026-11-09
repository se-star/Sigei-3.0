import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Network, Search, UserRound, type LucideIcon } from 'lucide-react';
import { TODOS_ITEMS, descripcionDe, etiquetaDe } from './navegacion';
import { useMisGrupos } from '@/pages/MiGrupo';
import { useAuth } from '@/hooks/useAuth';
import { useTabla } from '@/hooks/useDatos';
import { coincide, cx, nombreDocente, nombreGrupo } from '@/lib/utils';

interface Resultado {
  id: string;
  titulo: string;
  sub: string;
  ruta: string;
  icono: LucideIcon;
  seccion: string;
}

/** Paleta de comandos (Ctrl+K): navega a módulos y busca docentes y grupos. */
export function Paleta({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const { ver, perfil } = useAuth();
  const esDirector = useMisGrupos().length > 0;
  const esDocente = perfil?.rol === 'docente';
  const { data: docentes = [] } = useTabla('docentes');
  const { data: grupos = [] } = useTabla('grupos');
  const { data: grados = [] } = useTabla('grados');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierta) {
      setQ('');
      setSel(0);
    }
  }, [abierta]);

  const resultados = useMemo<Resultado[]>(() => {
    const mods = TODOS_ITEMS.filter((i) => (i.modulo === 'migrupo' ? esDirector : ver(i.modulo)) && coincide(q, etiquetaDe(i, esDocente), descripcionDe(i, esDocente))).map((i) => ({
      id: i.ruta,
      titulo: etiquetaDe(i, esDocente),
      sub: descripcionDe(i, esDocente),
      ruta: i.ruta,
      icono: i.icono,
      seccion: 'Ir a',
    }));
    if (!q.trim()) return mods;
    const docs = (ver('docentes') ? docentes : [])
      .filter((d) => coincide(q, d.nombres, d.apellidos, d.documento, d.email))
      .slice(0, 6)
      .map((d) => ({
        id: d.id,
        titulo: nombreDocente(d),
        sub: `${d.documento} · ${d.email}`,
        ruta: `/docentes/${d.id}`,
        icono: UserRound,
        seccion: 'Docentes',
      }));
    const grs = (ver('grupos') ? grupos : [])
      .filter((g) => coincide(q, nombreGrupo(g, grados)))
      .slice(0, 5)
      .map((g) => ({
        id: g.id,
        titulo: nombreGrupo(g, grados),
        sub: `${g.estudiantes} estudiantes`,
        ruta: `/horarios?grupo=${g.id}`,
        icono: Network,
        seccion: 'Grupos',
      }));
    return [...mods, ...docs, ...grs];
  }, [q, docentes, grupos, grados, ver, esDocente, esDirector]);

  useEffect(() => setSel(0), [q]);

  if (!abierta) return null;

  const ir = (r: Resultado | undefined) => {
    if (!r) return;
    onCerrar();
    nav(r.ruta);
  };

  let seccionPrevia = '';
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <div className="anim-fade absolute inset-0 bg-black/25" onClick={onCerrar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda rápida"
        className="anim-rise relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-5 text-muted" />
          <input
            ref={input}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCerrar();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, resultados.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              }
              if (e.key === 'Enter') ir(resultados[sel]);
            }}
            placeholder="¿Qué busca?"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-lista"
          />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul id="paleta-lista" role="listbox" className="scrollbar-thin max-h-[50vh] overflow-y-auto p-2">
          {resultados.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Sin resultados para “{q}”.</li>}
          {resultados.map((r, i) => {
            const cabecera = r.seccion !== seccionPrevia;
            seccionPrevia = r.seccion;
            return (
              <li key={r.seccion + r.id} role="option" aria-selected={i === sel}>
                {cabecera && (
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{r.seccion}</p>
                )}
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => ir(r)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                    i === sel ? 'bg-brand-soft text-brand-soft-ink' : 'hover:bg-surface-2',
                  )}
                >
                  <r.icono className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.titulo}</span>
                    <span className="block truncate text-xs opacity-70">{r.sub}</span>
                  </span>
                  {i === sel && <CornerDownLeft className="size-4 opacity-60" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
