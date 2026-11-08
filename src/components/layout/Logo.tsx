import { cx } from '@/lib/utils';

/** Símbolo de SIGEI: birrete blanco sobre el violeta de acento. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="20" fill="var(--accent)" />
      <path d="M13 27 32 17l19 10-19 10z" fill="#fff" />
      <path d="M21 32.5V41c0 3.8 5 7 11 7s11-3.2 11-7v-8.5l-11 6z" fill="#fff" fillOpacity=".72" />
    </svg>
  );
}

/** Logotipo tipográfico: “sigei” con tracking cerrado y punto violeta. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-baseline font-semibold tracking-[-0.06em] text-ink', className)}>
      sigei
      <span className="ml-[0.04em] inline-block size-[0.22em] translate-y-[-0.02em] rounded-full bg-accent" aria-hidden />
    </span>
  );
}
