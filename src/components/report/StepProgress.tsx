import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Report progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className="flex flex-1 items-center gap-2"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                done && "border-forest bg-forest text-forest-foreground",
                active && "border-ember bg-ember text-ember-foreground",
                !done && !active && "border-ink/15 text-muted-foreground",
              )}
            >
              {done ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="h-4 w-4" />
                </motion.span>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:block",
                active ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn("h-px flex-1", done ? "bg-forest" : "bg-ink/15")}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
