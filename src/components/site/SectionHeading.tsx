import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
  as: Tag = "h2",
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="eyebrow flex items-center gap-2 text-forest">
        <span className="h-px w-6 bg-ember" aria-hidden="true" />
        {eyebrow}
      </p>
      <Tag className="mt-4 text-3xl font-medium leading-[1.15] md:text-4xl">{title}</Tag>
      {intro && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{intro}</p>}
    </div>
  );
}
