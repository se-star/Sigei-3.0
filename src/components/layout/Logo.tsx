import { useId } from 'react';
import { cx } from '@/lib/utils';

/*
 * Marca SIGEI TIC (ver public/marca y el manual de marca).
 * El símbolo es un hexágono con degradado de celeste a azul, pistas de circuito
 * que suben y un nodo ámbar. El corte entre el hexágono y las pistas externas se
 * hace con máscaras, así el símbolo funciona sobre cualquier fondo, claro u oscuro.
 */
const HEX = 'M54 24 88.6 44V84L54 104 19.4 84V44z';
const PISTAS = 'M32 58 97.8 20M38 76 102.1 39M48.6 90.5 80.6 72';
const RAMAS = 'M50 48.4V54.9M70 57.5V51';
const NODOS: [number, number, number][] = [
  [32, 58, 4.2],
  [38, 76, 4.2],
  [48.6, 90.5, 4.2],
  [80.6, 72, 3.8],
  [50, 58.5, 3.6],
  [70, 47.4, 3.6],
];

/** Símbolo de SIGEI TIC. Mantiene su proporción cuadrada; el tamaño lo da `className`. */
export function Logo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const grad = `url(#${id}g)`;
  return (
    <svg viewBox="14 14 96 96" className={cx('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="104">
          <stop offset="0" stopColor="#19D3FF" />
          <stop offset="1" stopColor="#0050D0" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={HEX} />
        </clipPath>
        <mask id={`${id}f`} maskUnits="userSpaceOnUse" x="0" y="0" width="130" height="130">
          <rect width="130" height="130" fill="#fff" />
          <path d={HEX} fill="#000" stroke="#000" strokeWidth="4.2" />
          <circle cx="102.1" cy="39" r="3" fill="#000" />
        </mask>
        <mask id={`${id}b`} maskUnits="userSpaceOnUse" x="0" y="0" width="130" height="130">
          <rect width="130" height="130" fill="#fff" />
          <path d={HEX} fill="none" stroke="#000" strokeWidth="4.2" />
        </mask>
      </defs>
      <path d={PISTAS} fill="none" stroke={grad} strokeWidth="4.6" strokeLinecap="round" mask={`url(#${id}f)`} />
      <g mask={`url(#${id}b)`}>
        <path d={HEX} fill={grad} />
        <path d={`${PISTAS} ${RAMAS}`} fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" clipPath={`url(#${id}c)`} />
      </g>
      {NODOS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={grad} stroke="#fff" strokeWidth="2.8" />
      ))}
      <circle cx="102.1" cy="39" r="4.4" fill="none" stroke={grad} strokeWidth="3" />
      <circle cx="97.8" cy="20" r="6" fill="#FFB000" />
    </svg>
  );
}

/**
 * Logotipo: «sigei» en minúsculas gruesas con el punto de la i en ámbar y «TIC»
 * en mayúsculas azules. El tamaño se controla con el tamaño de letra (`text-[..]`).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cx('inline-flex items-baseline gap-[0.2em] font-marca leading-none font-bold tracking-[-0.01em] whitespace-nowrap text-ink', className)}
      role="img"
      aria-label="SIGEI TIC"
    >
      <span aria-hidden>
        sige
        <span className="relative mx-[0.05em] inline-block h-[0.486em] w-[0.135em] rounded-[0.02em] bg-current">
          <span className="absolute bottom-[calc(100%+0.1em)] left-1/2 -ml-[0.105em] size-[0.21em] rounded-full bg-marca-punto" />
        </span>
      </span>
      <span aria-hidden className="font-semibold text-marca-tic">
        TIC
      </span>
    </span>
  );
}
