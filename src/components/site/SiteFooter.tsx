import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const PLATFORM_LINKS = [
  { to: "/explore", label: "Explore issues" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/report", label: "Report an issue" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[2fr_1fr]">
        <div className="max-w-md">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            A civic grievance platform that empowers citizens to report civic problems, track their resolution in real time, and hold public departments accountable.
          </p>
          <p className="mt-4 eyebrow text-muted-foreground">Official Citizen Civic Engagement Platform</p>
        </div>
        <div>
          <h2 className="eyebrow font-sans text-muted-foreground">Platform</h2>
          <ul className="mt-4 space-y-2.5">
            {PLATFORM_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm transition-colors hover:text-ember">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/10">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} NAGRIKX. Verified civic grievance resolution system.
        </p>
      </div>
    </footer>
  );
}
