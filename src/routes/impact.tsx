import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { Impact } from "@/components/landing/Impact";
import { FinalCta } from "@/components/landing/FinalCta";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Our impact — NAGRIKX" },
      {
        name: "description",
        content: "How NAGRIKX makes civic issue resolution visible, timestamped and accountable.",
      },
      { property: "og:title", content: "Our impact — NAGRIKX" },
      { property: "og:description", content: "Accountability you can actually see." },
    ],
  }),
  component: () => (
    <PageShell>
      <Impact asPage />
      <div className="h-20" />
      <FinalCta />
    </PageShell>
  ),
});
