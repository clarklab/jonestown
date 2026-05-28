import { useRef, useState } from "react";
import { CameraIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

export function PhotoCapture({
  blob,
  onChange,
  className = "",
}: {
  blob: Blob | null;
  onChange: (blob: Blob | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // generate preview when blob changes
  if (blob && !preview) {
    const url = URL.createObjectURL(blob);
    setPreview(url);
  }
  if (!blob && preview) {
    URL.revokeObjectURL(preview);
    setPreview(null);
  }

  const handleFile = async (file: File) => {
    const compressed = await compressImage(file, 1600, 0.85);
    onChange(compressed);
  };

  if (preview) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-bg-card outline-1 -outline-offset-1 outline-white/10 ${className}`}
      >
        <img
          src={preview}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(null)}
          className="pressable absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-bg/80 backdrop-blur-md ring-1 ring-white/10"
          aria-label="Remove photo"
        >
          <XMarkIcon className="size-5 stroke-ink" />
        </motion.button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`pressable group relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-bg-card outline-1 -outline-offset-1 outline-dashed outline-white/15 ${className}`}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
        <CameraIcon className="size-6 stroke-ink-muted" />
      </div>
      <span className="text-sm font-medium text-ink-muted">
        Add a photo
      </span>
      <span className="text-xs text-ink-dim">tap to take or upload</span>
      <input
        ref={inputRef}
        type="file"
        name="photo"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Add photo"
      />
    </button>
  );
}

export function CompactPhotoButton({
  blob,
  onChange,
}: {
  blob: Blob | null;
  onChange: (blob: Blob | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  if (blob && !preview) {
    setPreview(URL.createObjectURL(blob));
  }
  if (!blob && preview) {
    URL.revokeObjectURL(preview);
    setPreview(null);
  }

  const handleFile = async (file: File) => {
    const compressed = await compressImage(file, 1600, 0.85);
    onChange(compressed);
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="pressable group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-bg-card outline-1 -outline-offset-1 outline-white/10"
    >
      {preview ? (
        <>
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-bg/40 opacity-0 group-active:opacity-100" />
        </>
      ) : (
        <PlusIcon className="size-6 stroke-ink-muted" />
      )}
      <input
        ref={inputRef}
        type="file"
        name="photo"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Add photo"
      />
    </button>
  );
}

async function compressImage(
  file: File,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  // Read as bitmap, resize via canvas, output webp
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", quality),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
