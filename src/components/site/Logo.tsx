import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** Brand mark: a map pin whose head is an "X" crossroads — reporting at an intersection. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-8 w-8", className)}>
      <path
        d="M16 2C9.4 2 4.5 6.9 4.5 13.2 4.5 21.6 16 30 16 30s11.5-8.4 11.5-16.8C27.5 6.9 22.6 2 16 2Z"
        className="fill-forest"
      />
      <path
        d="M11.5 8.8 20.5 17.6M20.5 8.8 11.5 17.6"
        className="stroke-ember"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="NAGRIKX home" className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-sans text-xl font-bold">
        NAGRIK<span className="text-ember">X</span>
      </span>
    </Link>
  );
}
