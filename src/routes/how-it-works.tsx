import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Categories } from "@/components/landing/Categories";
import { FinalCta } from "@/components/landing/FinalCta";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "How it works — NAGRIKX" },
      {
        name: "description",
        content:
          "Report, review, resolve: how a NAGRIKX complaint travels from your street to a verified fix.",
      },
      { property: "og:title", content: "How it works — NAGRIKX" },
      { property: "og:description", content: "Report, review, resolve — every step visible." },
    ],
  }),
  component: () => (
    <PageShell>
      <HowItWorks asPage />
      <Categories />
      <FinalCta />
    </PageShell>
  ),
});
