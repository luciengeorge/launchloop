import Link from "next/link";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-foreground" />
      <path
        d="M10.5 20.5c-2.5-2.5-2.5-6.5 0-9s6.5-2.5 9 0l2 2m0 0V9.5m0 4h-4"
        fill="none"
        className="stroke-primary"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21.5" cy="21" r="2.4" className="fill-background" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="LaunchLoop home">
      <LogoMark />
      <span className="text-lg">LaunchLoop</span>
    </Link>
  );
}
