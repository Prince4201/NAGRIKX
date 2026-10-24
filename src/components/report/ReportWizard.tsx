import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldWrapper, FormNotice, TextField, inputClass } from "@/components/forms/FormField";
import { ISSUE_CATEGORIES, getCategory, type IssueCategoryId } from "@/lib/demo-data";
import {
  REPORT_LIMITS,
  reportDetailsSchema,
  reportLocationSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation";
import { uploadReportPhotos, removeUnusedPhotos } from "@/lib/backend";
import { submitReport } from "@/lib/civic.functions";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { StepProgress } from "./StepProgress";
import { ImageUpload, type UploadedImage } from "./ImageUpload";

const STEPS = ["Describe", "Photos", "Location", "Review"];

interface ReportDraft {
  title: string;
  description: string;
  category: IssueCategoryId | "";
  images: UploadedImage[];
  address: string;
  city: string;
  coords: { lat: number; lng: number } | null;
}

export function ReportWizard({
  initialCategory,
}: {
  initialCategory?: IssueCategoryId | undefined;
}) {
  const reduce = useReducedMotion();
  const sendReport = useServerFn(submitReport);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [d, setD] = useState<ReportDraft>({
    title: "",
    description: "",
    category: initialCategory ?? "",
    images: [],
    address: "",
    city: "",
    coords: null,
  });
  const set = <K extends keyof ReportDraft>(k: K, val: ReportDraft[K]) =>
    setD((p) => ({ ...p, [k]: val }));

  function validate(s: number): boolean {
    const result =
      s === 0
        ? reportDetailsSchema.safeParse(d)
        : s === 2
          ? reportLocationSchema.safeParse(d)
          : null;
    if (result && !result.success) {
      setErrors(toFieldErrors(result.error));
      return false;
    }
    setErrors({});
    return true;
  }
  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const next = () => validate(step) && go(step + 1);

  function locateMe() {
    if (!("geolocation" in navigator))
      return setErrors({ ...errors, address: "Your browser doesn't support location access." });
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("coords", { lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setErrors({
          ...errors,
          address: "Couldn't get your location. Please type the address instead.",
        });
        setLocating(false);
      },
      { timeout: 10000 },
    );
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    let paths: string[] = [];
    try {
      if (!validate(0) || !validate(2)) return;
      const id = crypto.randomUUID();
      paths = await uploadReportPhotos(id, d.images.map(i=>i.file));
      const saved = await sendReport({data:{id,title:d.title,description:d.description,category:d.category as IssueCategoryId,address:d.address,city:d.city,latitude:d.coords?.lat,longitude:d.coords?.lng,photos:paths}});
      paths = [];
      await queryClient.invalidateQueries({queryKey:["workspace"]});
      await navigate({to:"/reports/$id",params:{id:saved}});
    } catch (err) {
      await removeUnusedPhotos(paths);
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const cat = d.category ? getCategory(d.category) : null;

  return (
    <div className="rounded-lg border border-border bg-paper p-5 shadow-soft sm:p-8">
      <StepProgress steps={STEPS} current={step} />
      <div className="relative mt-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 30 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -30 * dir }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {step === 0 && (
              <>
                <h2 className="text-3xl">What's the problem?</h2>
                <FieldWrapper id="category" label="Category" error={errors["category"]}>
                  <div
                    id="category"
                    role="radiogroup"
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    {ISSUE_CATEGORIES.map((c) => (
                      <Button
                        variant="outline"
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={d.category === c.id}
                        onClick={() => set("category", c.id)}
                        className={cn(
                          "h-auto min-h-20 whitespace-normal flex-col items-start justify-start gap-2 rounded-md border p-3 text-left text-sm shadow-none transition-colors",
                          d.category === c.id
                            ? "border-ember bg-peach/60"
                            : "border-ink/10 bg-paper hover:border-ink/30",
                        )}
                      >
                        <c.icon className="h-5 w-5 text-forest" /> {c.label}
                      </Button>
                    ))}
                  </div>
                </FieldWrapper>
                <TextField
                  label="Title"
                  placeholder="e.g. Deep pothole outside City Hospital gate"
                  maxLength={REPORT_LIMITS.titleMax}
                  hint={`${d.title.length}/${REPORT_LIMITS.titleMax}`}
                  value={d.title}
                  error={errors["title"]}
                  onChange={(e) => set("title", e.target.value)}
                />
                <FieldWrapper
                  id="description"
                  label="Description"
                  error={errors["description"]}
                  hint={`${d.description.length}/${REPORT_LIMITS.descriptionMax}`}
                >
                  <textarea
                    id="description"
                    rows={5}
                    maxLength={REPORT_LIMITS.descriptionMax}
                    value={d.description}
                    onChange={(e) => set("description", e.target.value)}
                    aria-invalid={Boolean(errors["description"])}
                    placeholder="What did you see, how long has it been there, and is anyone at risk?"
                    className={cn(inputClass, "resize-none")}
                  />
                </FieldWrapper>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-3xl">Add photographs</h2>
                <p className="text-muted-foreground">
                  Clear photos help officers understand the issue faster. Optional, but recommended.
                </p>
                <ImageUpload images={d.images} onChange={(imgs) => set("images", imgs)} />
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-3xl">Where is it?</h2>
                <TextField
                  label="Street, landmark or area"
                  placeholder="e.g. Near Hanuman Mandir, MG Road"
                  value={d.address}
                  error={errors["address"]}
                  onChange={(e) => set("address", e.target.value)}
                />
                <TextField
                  label="City"
                  placeholder="e.g. Lucknow"
                  value={d.city}
                  error={errors["city"]}
                  onChange={(e) => set("city", e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sage/60 p-4">
                  <Button
                    type="button"
                    variant="forest"
                    size="sm"
                    onClick={locateMe}
                    disabled={locating}
                  >
                    {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Use my
                    current location
                  </Button>
                  <span className="text-sm text-forest">
                    {d.coords
                      ? `Pinned at ${d.coords.lat.toFixed(5)}, ${d.coords.lng.toFixed(5)}`
                      : "Optional — attaches exact coordinates."}
                  </span>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-3xl">Review your report</h2>
                <dl className="divide-y rounded-2xl border bg-paper">
                  {[
                    ["Category", cat?.label ?? "—"],
                    ["Title", d.title],
                    ["Description", d.description],
                    [
                      "Location",
                      `${d.address}, ${d.city}${d.coords ? ` (${d.coords.lat.toFixed(4)}, ${d.coords.lng.toFixed(4)})` : ""}`,
                    ],
                  ].map(([k, val]) => (
                    <div key={k} className="grid gap-1 p-4 sm:grid-cols-[140px_1fr]">
                      <dt className="text-sm text-muted-foreground">{k}</dt>
                      <dd className="break-words">{val}</dd>
                    </div>
                  ))}
                  <div className="grid gap-2 p-4 sm:grid-cols-[140px_1fr]">
                    <dt className="text-sm text-muted-foreground">Photos</dt>
                    <dd>
                      {d.images.length === 0 ? (
                        "None added"
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {d.images.map((i) => (
                            <img
                              key={i.id}
                              src={i.url}
                              alt={i.file.name}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </dd>
                  </div>
                </dl>
                <FormNotice>
                  Your report and photographs stay private to you and authorized staff. Administrators may publish the title, city and status.
                </FormNotice>
                {submitError && <FormNotice tone="error">{submitError}</FormNotice>}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between border-t pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => go(step - 1)}
          disabled={step === 0 || submitting}
        >
          <ArrowLeft /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button type="button" variant="forest" onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <MapPin /> Submit report
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
