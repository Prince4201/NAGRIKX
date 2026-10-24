import { Camera, Sparkles, BadgeCheck } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";

const STEPS = [
  {
    n: "01",
    icon: Camera,
    title: "Report",
    body: "Share the problem, a photograph and the location. It takes about a minute.",
    tone: "bg-peach",
  },
  {
    n: "02",
    icon: Sparkles,
    title: "Review",
    body: "The platform helps categorise the issue and flags possibly related reports — as suggestions a human reviews, never as verdicts.",
    tone: "bg-sage",
  },
  {
    n: "03",
    icon: BadgeCheck,
    title: "Resolve",
    body: "Authorised officers update the complaint and share resolution evidence you can see.",
    tone: "bg-forest text-forest-foreground",
  },
];

export function HowItWorks({ asPage = false }: { asPage?: boolean }) {
  return (
    <section className="border-y border-border bg-paper px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          as={asPage ? "h1" : "h2"}
          eyebrow="How it works"
          title={
            <>
              From a photo on the street <em className="text-ember">to a fix on record.</em>
            </>
          }
          intro="Three steps, each one visible to you."
        />
        <ol className="relative mt-10 grid gap-5 md:grid-cols-3">
          <span
            className="absolute left-0 right-0 top-14 hidden h-px border-t-2 border-dashed border-ink/15 md:block"
            aria-hidden="true"
          />
          {STEPS.map((s, i) => (
            <Reveal
              key={s.n}
              delay={i * 0.12}
              className="h-full"
            >
              <li className="group relative h-full rounded-lg border border-border bg-background p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lift motion-reduce:transform-none">
                <div className="flex items-center justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-lg text-forest transition-transform duration-500 group-hover:-rotate-6 motion-reduce:transform-none ${s.tone}`}>
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{s.n} / 03</span>
                </div>
                <h3 className="mt-6 text-2xl">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
