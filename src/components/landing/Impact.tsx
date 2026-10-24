import { Eye, Clock, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";

/** Illustrative weekly trend — demonstration values only. */
const DEMO_WEEKS = [
  { w: "W1", reported: 34, resolved: 12 },
  { w: "W2", reported: 41, resolved: 20 },
  { w: "W3", reported: 38, resolved: 27 },
  { w: "W4", reported: 45, resolved: 33 },
  { w: "W5", reported: 40, resolved: 36 },
  { w: "W6", reported: 36, resolved: 35 },
];
const MAX = 50;

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Visible by default",
    body: "Every complaint has a public status trail, so progress can't quietly stall.",
  },
  {
    icon: Clock,
    title: "Time is tracked",
    body: "Unresolved issues surface to supervisors for escalation instead of disappearing.",
  },
  {
    icon: Users,
    title: "Communities, not tickets",
    body: "Related reports from neighbours are grouped, so one problem gets one strong voice.",
  },
];

export function Impact({ asPage = false }: { asPage?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <section className="bg-forest px-4 py-20 text-forest-foreground md:py-28">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionHeading
            as={asPage ? "h1" : "h2"}
            eyebrow="Community impact"
            title={
              <>
                Accountability you can <em className="text-ember">actually see.</em>
              </>
            }
            intro={
              <span className="text-forest-foreground/75">
                When reports are public and timestamped, responsibility has an address. NAGRIKX
                turns scattered complaints into a shared record of how a city is doing.
              </span>
            }
            className="[&_p:first-child]:text-sage"
          />
          <ul className="mt-10 space-y-6">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <li className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-foreground/10">
                    <p.icon className="h-5 w-5 text-ember" />
                  </span>
                  <div>
                    <h3 className="font-sans text-base font-semibold tracking-normal">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-forest-foreground/70">
                      {p.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal className="self-center">
          <figure className="rounded-lg bg-ivory p-6 text-ink shadow-lift md:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <figcaption className="font-display text-2xl">Reported vs. resolved</figcaption>
              <span className="eyebrow rounded-full bg-peach px-2.5 py-1 text-ink">
                Illustrative data
              </span>
            </div>
            <div
              className="mt-8 flex h-56 items-end gap-3 md:gap-5"
              role="img"
              aria-label="Illustrative chart: resolved issues catch up with reported issues over six weeks"
            >
              {DEMO_WEEKS.map((d, index) => (
                <div key={d.w} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-48 w-full items-end justify-center gap-1">
                    <motion.span
                      initial={reduce ? false : { scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className="w-1/2 origin-bottom rounded-t-sm bg-peach"
                      style={{ height: `${(d.reported / MAX) * 100}%` }}
                    />
                    <motion.span
                      initial={reduce ? false : { scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className="w-1/2 origin-bottom rounded-t-sm bg-forest"
                      style={{ height: `${(d.resolved / MAX) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{d.w}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-5 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-peach" /> Reported
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-forest" /> Resolved
              </span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Example of the trend view citizens will see. Not real-world figures.
            </p>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
