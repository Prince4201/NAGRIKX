import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/site/Logo";
import { Reveal } from "@/components/site/Reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-sage px-6 py-16 md:py-20">
      <div className="grain relative mx-auto max-w-6xl">
        <LogoMark className="absolute -right-10 -top-10 h-72 w-72 opacity-10 md:h-96 md:w-96" />
        <Reveal className="relative max-w-2xl">
          <h2 className="text-3xl font-medium leading-[1.15] md:text-5xl">
            Noticed something on your street <em className="text-forest">today?</em>
          </h2>
          <p className="mt-5 max-w-lg text-lg text-ink/70">
            One clear report is how change starts. Add a photo, drop a location, and follow it to
            resolution.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="ink">
              <Link to="/report">
                Report an Issue <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/register">Create a free account</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
