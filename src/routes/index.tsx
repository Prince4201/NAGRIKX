import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { CivicFaq } from "@/components/landing/CivicFaq";
import { Hero } from "@/components/landing/Hero";
import { CityPreview } from "@/components/landing/CityPreview";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Impact } from "@/components/landing/Impact";
import { Categories } from "@/components/landing/Categories";
import { FinalCta } from "@/components/landing/FinalCta";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "NAGRIKX — Your City. Your Voice. Real Change." },
      {
        name: "description",
        content:
          "Report civic issues, follow their progress and help build cleaner, safer communities with NAGRIKX.",
      },
      { property: "og:title", content: "NAGRIKX — Your City. Your Voice. Real Change." },
      {
        property: "og:description",
        content:
          "Report potholes, garbage, broken streetlights and more — and track them to resolution.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <Hero />
      <section id="city-preview" className="scroll-mt-24 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Around the neighbourhood"
            title="See what's happening around you."
            intro="A shared view of the streets we call home. Illustrative sample reports — not live city records."
          />
          <Reveal className="mt-10">
            <CityPreview />
          </Reveal>
        </div>
      </section>
      <HowItWorks />
      <Categories />
      <Impact />
      <CivicFaq />
      <FinalCta />
    </PageShell>
  );
}
