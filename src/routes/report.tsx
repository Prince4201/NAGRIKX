import { useEffect, useState, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Shield, ArrowRight, Loader2 } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ReportWizard } from "@/components/report/ReportWizard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isDevSignedIn, getStoredDevToken, parseDevToken } from "@/lib/dev-auth";
import { ISSUE_CATEGORIES, type IssueCategoryId } from "@/lib/demo-data";
import { workspaceQuery } from "@/lib/workspace-query";

const ids = ISSUE_CATEGORIES.map((c) => c.id) as [IssueCategoryId, ...IssueCategoryId[]];
const searchSchema = z.object({ category: z.enum(ids).optional().catch(undefined) });

export const Route = createFileRoute("/report")({
  validateSearch: searchSchema,
  loader: ({ context }) => {
    if (typeof window !== "undefined" && isDevSignedIn()) {
      return context.queryClient.ensureQueryData(workspaceQuery).catch(() => null);
    }
    return null;
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Report an issue — NAGRIKX" },
      {
        name: "description",
        content:
          "Report a pothole, garbage, broken streetlight or other civic issue in four quick steps.",
      },
      { property: "og:title", content: "Report an issue — NAGRIKX" },
      {
        property: "og:description",
        content: "Describe it, add a photo, drop the location. Four quick steps.",
      },
    ],
  }),
  component: ReportPage,
});

function WorkspaceLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-forest" />
    </div>
  );
}

function ReportPage() {
  const { category } = Route.useSearch();

  // Instant synchronous auth check for dev sessions
  const [signedIn, setSignedIn] = useState<boolean>(() => {
    if (typeof window !== "undefined" && isDevSignedIn()) return true;
    return false;
  });

  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== "undefined" && isDevSignedIn()) {
      const parsed = parseDevToken(getStoredDevToken() || "");
      return parsed?.role || "citizen";
    }
    return null;
  });

  useEffect(() => {
    const check = async () => {
      if (isDevSignedIn()) {
        const parsed = parseDevToken(getStoredDevToken() || "");
        setSignedIn(true);
        setUserRole(parsed?.role || "citizen");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setSignedIn(true);
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();
        setUserRole(roleRow?.role || "citizen");
      } else {
        setSignedIn(false);
        setUserRole(null);
      }
    };
    void check();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSignedIn(true);
        void check();
      } else if (isDevSignedIn()) {
        const parsed = parseDevToken(getStoredDevToken() || "");
        setSignedIn(true);
        setUserRole(parsed?.role || "citizen");
      } else {
        setSignedIn(false);
        setUserRole(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // When signed in as a staff/officer/admin, show notice inside WorkspaceShell
  if (signedIn && (userRole === "department_officer" || userRole === "admin")) {
    return (
      <Suspense fallback={<WorkspaceLoading />}>
        <WorkspaceShell title="Staff & Officer Workspace">
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-paper p-8 text-center space-y-4 shadow-lift">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/10 text-forest">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-display">Staff & Officer Workspace</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Civic issue reporting is reserved exclusively for citizens. As an authorized{" "}
              <strong className="text-foreground">
                {userRole === "admin" ? "Administrator" : "Department Officer"}
              </strong>
              , please manage, route, and resolve public complaints directly from your workspace.
            </p>
            <div className="pt-2">
              <Button asChild variant="forest" size="lg">
                <Link to={userRole === "admin" ? "/admin" : "/dashboard"}>
                  Go to {userRole === "admin" ? "Admin Panel" : "Officer Queue"}{" "}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </WorkspaceShell>
      </Suspense>
    );
  }

  // When signed in as a citizen, render the form inside WorkspaceShell with workspace navigation
  if (signedIn) {
    return (
      <Suspense fallback={<WorkspaceLoading />}>
        <WorkspaceShell title="New Grievance Report">
          <div className="grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.4fr]">
            <div>
              <p className="eyebrow text-forest">New report</p>
              <h2 className="mt-3 text-4xl font-medium leading-[1.1] sm:text-5xl">
                Tell us what <em className="text-ember">needs fixing.</em>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">
                Four short steps. Be specific about the place — a nearby landmark helps officers find
                it quickly.
              </p>
            </div>
            <ReportWizard initialCategory={category} />
          </div>
        </WorkspaceShell>
      </Suspense>
    );
  }

  // Unauthenticated visitor from public site
  return (
    <PageShell>
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.4fr]">
          <div>
            <p className="eyebrow text-forest">New report</p>
            <h1 className="mt-3 text-5xl font-medium leading-[1]">
              Tell us what <em className="text-ember">needs fixing.</em>
            </h1>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Four short steps. Be specific about the place — a nearby landmark helps officers find
              it quickly.
            </p>
          </div>
          <ReportWizard initialCategory={category} />
        </div>
      </section>
    </PageShell>
  );
}
