import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { ISSUE_CATEGORIES } from "@/lib/demo-data";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { cn } from "@/lib/utils";

export function Categories() {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="What you can report"
          title="If it's broken in public, it belongs here."
        />
        <div className="mt-10 grid auto-rows-[minmax(170px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ISSUE_CATEGORIES.map((c, i) => (
            <Reveal
              key={c.id}
              delay={i * 0.05}
              className={cn(i === 0 && "lg:col-span-2")}
            >
              <Link
                to="/report"
                search={{ category: c.id }}
                className={cn(
                  "group flex h-full flex-col justify-between gap-6 overflow-hidden rounded-lg border border-border bg-paper p-5 transition-all duration-500 hover:-translate-y-1 hover:border-forest/30 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none",
                  i === 0 && "bg-peach/50",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-md", c.tone)}><c.icon className="h-5 w-5 transition-transform duration-500 group-hover:-rotate-6 motion-reduce:transform-none" strokeWidth={1.6} /></span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 opacity-60 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
                <div>
                  <h3 className="text-xl">{c.label}</h3>
                  <p className="mt-2 text-sm opacity-75">{c.description}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
