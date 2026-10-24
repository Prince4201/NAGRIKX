import type { ReactNode } from "react";
import { Logo } from "@/components/site/Logo";
import cityHero from "@/assets/civic-city.jpg";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-4xl font-medium">{title}</h1>
          <p className="mt-3 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
        </div>
      </div>
      <aside className="relative hidden p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-lg">
          <img
            src={cityHero}
            alt=""
            width={1920}
            height={1024}
            className="h-full w-full object-cover object-right"
          />
          <div className="absolute bottom-6 left-6 right-6 rounded-lg bg-ivory/90 p-6 backdrop-blur">
            <p className="font-display text-2xl leading-snug">
              “One clear report is how a street gets fixed.”
            </p>
            <p className="eyebrow mt-3 text-muted-foreground">The NAGRIKX idea</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
