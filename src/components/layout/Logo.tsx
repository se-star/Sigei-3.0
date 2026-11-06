export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#d9f99d" />
      <path d="M14 26 32 16l18 10-18 10z" fill="#0d2b28" />
      <path d="M22 31.5V41c0 3.6 4.6 7 10 7s10-3.4 10-7v-9.5l-10 5.6z" fill="#0f5f58" />
      <circle cx="48" cy="38" r="3" fill="#0d2b28" />
      <path d="M48 27v11" stroke="#0d2b28" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
