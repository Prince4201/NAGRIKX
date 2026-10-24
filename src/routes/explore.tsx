import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { SectionHeading } from "@/components/site/SectionHeading";
import { CityPreview } from "@/components/landing/CityPreview";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Explore issues — NAGRIKX" },
      {
        name: "description",
        content: "Browse civic issues reported around the city and follow their status.",
      },
      { property: "og:title", content: "Explore issues — NAGRIKX" },
      { property: "og:description", content: "A map of civic issues and their progress." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  return (
    <PageShell>
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            as="h1"
            eyebrow="Explore issues"
            title="The city, issue by issue."
            intro="This is an illustrative preview with sample reports. Real reports will appear here once they can be submitted."
          />
          <div className="mt-10 min-w-0">
            <CityPreview showCta={false} />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
