import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { workspaceQuery } from "@/lib/workspace-query";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceFooter } from "./WorkspaceFooter";

export interface WorkspaceShellProps {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

export function WorkspaceShell({ title, children, headerAction }: WorkspaceShellProps) {
  const { data } = useSuspenseQuery(workspaceQuery);
  const role = data.role.role;
  const roleLabel = role.replaceAll("_", " ");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ink-foreground"
      >
        Skip to main content
      </a>

      {/* Dedicated authenticated workspace header */}
      <WorkspaceHeader />

      {/* Main Workspace content */}
      <main id="workspace-main" className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Breadcrumb & Section Heading */}
          <div className="mb-8 border-b border-border pb-6">
            <nav
              aria-label="Workspace breadcrumb"
              className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Link to="/dashboard" className="transition-colors hover:text-foreground">
                Workspace
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="capitalize">{roleLabel}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="max-w-[200px] truncate font-medium text-foreground sm:max-w-none">
                {title}
              </span>
            </nav>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-forest">{roleLabel} workspace</p>
                <h1 className="mt-2 text-3xl font-display font-semibold text-foreground sm:text-4xl">
                  {title}
                </h1>
              </div>
              {headerAction && <div>{headerAction}</div>}
            </div>
          </div>

          {/* Page body */}
          <div className="space-y-8">{children}</div>
        </section>
      </main>

      {/* Dedicated workspace footer */}
      <WorkspaceFooter
        userName={data.profile.full_name}
        roleName={data.role.role}
      />
    </div>
  );
}
