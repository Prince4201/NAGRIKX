import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { to: "/report", label: "Report an issue" },
      { to: "/explore", label: "Explore issues" },
      { to: "/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Community",
    links: [
      { to: "/impact", label: "Our impact" },
      { to: "/register", label: "Create account" },
      { to: "/login", label: "Sign in" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            A civic grievance platform that helps citizens report problems, follow their resolution
            and see how their communities improve.
          </p>
          <p className="mt-4 eyebrow text-muted-foreground">Phase 1 · Preview build</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="eyebrow font-sans text-muted-foreground">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm hover:text-ember">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink/10">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} NAGRIKX. Map previews and metrics shown are illustrative
          demonstration data.
        </p>
      </div>
    </footer>
  );
}
