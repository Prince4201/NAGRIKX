import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { REPORT_LIMITS } from "@/lib/validation";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  id: string;
  file: File;
  url: string;
}

export function ImageUpload({
  images,
  onChange,
}: {
  images: UploadedImage[];
  onChange: (imgs: UploadedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Release object URLs when the component unmounts
  const latest = useRef(images);
  latest.current = images;
  // Draft previews remain valid while moving between wizard steps.

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next = [...images];
    for (const file of Array.from(list)) {
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
        setError(`${file.name} must be JPG, PNG or WebP.`);
        continue;
      }
      if (file.size > REPORT_LIMITS.maxImageMB * 1024 * 1024) {
        setError(`${file.name} is larger than ${REPORT_LIMITS.maxImageMB} MB.`);
        continue;
      }
      if (next.length >= REPORT_LIMITS.maxImages) {
        setError(`You can add up to ${REPORT_LIMITS.maxImages} photos.`);
        break;
      }
      next.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    onChange(next);
  }

  function remove(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.url);
    onChange(images.filter((i) => i.id !== id));
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-ember bg-peach/50" : "border-ink/15 bg-paper hover:border-ember/60",
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage text-forest">
          <ImagePlus className="h-6 w-6" />
        </span>
        <span className="font-medium">Drop photos here or click to browse</span>
        <span className="text-sm text-muted-foreground">
          Up to {REPORT_LIMITS.maxImages} images · {REPORT_LIMITS.maxImageMB} MB each
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-label="Upload photos"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <li
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-xl border"
            >
              <img src={img.url} alt={img.file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(img.id)}
                aria-label={`Remove ${img.file.name}`}
                className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 p-1.5 text-ink-foreground hover:bg-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
