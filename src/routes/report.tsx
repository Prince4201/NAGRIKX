import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageShell } from "@/components/site/PageShell";
import { ReportWizard } from "@/components/report/ReportWizard";
import { ISSUE_CATEGORIES, type IssueCategoryId } from "@/lib/demo-data";

const ids = ISSUE_CATEGORIES.map((c) => c.id) as [IssueCategoryId, ...IssueCategoryId[]];
const searchSchema = z.object({ category: z.enum(ids).optional().catch(undefined) });

export const Route = createFileRoute("/report")({
  validateSearch: searchSchema,
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

function ReportPage() {
  const { category } = Route.useSearch();
  return (
    <PageShell>
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.4fr]">
          <div>
            <p className="eyebrow text-forest">New report</p>
            <h1 className="mt-3 text-5xl font-medium leading-[1]">
              Tell us what <em className="text-ember">needs fixing.</em>
            </h1>
            <p className="mt-5 text-muted-foreground">
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
