import { Search, X } from 'lucide-react';
import { cx } from '@/lib/utils';

export function Buscador({
  valor,
  onCambio,
  placeholder = 'Buscar…',
  className,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {valor && (
        <button
          onClick={() => onCambio('')}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-2"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
