import { useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Icon } from "~/components/Icon";
import { BrandTile } from "~/components/BrandMark";
import { APP_PIN } from "~/data/db";

const PIN_LENGTH = APP_PIN.length;

export function LandingPage({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="relative isolate mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-12 pb-8 safe-bottom">
      <Splash />

      <header className="relative flex items-center gap-3">
        <BrandTile size={48} rounded={16} />
        <div>
          <p className="display-tight text-xl text-ink">Jonestown</p>
          <p className="text-[11px] font-bold tracking-[0.18em] text-ink-dim uppercase">
            Clark &amp; Angie only
          </p>
        </div>
      </header>

      <div className="relative mt-11 flex-1">
        <p className="text-[11px] font-bold tracking-[0.22em] text-ink-dim uppercase">
          A supper club of exactly two
        </p>
        <h1 className="display-tight mt-2 text-[50px] leading-[0.92] tracking-tight text-balance text-ink">
          Yelp for the couple who{" "}
          <span className="text-tennis-700">always goes back</span>.
        </h1>
        <p className="mt-4 max-w-[42ch] text-pretty text-base text-ink-muted">
          Our own private map of every restaurant in town. We each rate the
          spots we hit — and a place only lights up once both of us have
          weighed in. No groups. No strangers. Just us, arguing about brisket.
        </p>

        <div className="mt-9 grid grid-cols-3 gap-3">
          <Feature
            icon="join_inner"
            label="Just us two"
            sub="A club of two"
          />
          <Feature
            icon="explore"
            label="The whole map"
            sub="Unlock together"
          />
          <Feature
            icon="balance"
            label="Dueling takes"
            sub="Mine vs yours"
          />
        </div>
      </div>

      <PinGate onUnlock={onUnlock} />

      <p className="relative mt-7 text-center text-[11px] leading-relaxed text-ink-faint">
        Want your own two-person edition?{" "}
        <a
          href="mailto:clark@superfun.team?subject=I%20want%20my%20own%20Jonestown"
          className="font-bold text-ink-dim underline underline-offset-2"
        >
          Email me
        </a>
        .
      </p>
    </div>
  );
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState<string[]>(
    Array(PIN_LENGTH).fill(""),
  );
  const [error, setError] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const shake = useAnimationControls();

  const pin = digits.join("");
  const complete = pin.length === PIN_LENGTH && digits.every(Boolean);

  const focusCell = (i: number) => {
    const el = inputsRef.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const attempt = (value: string) => {
    if (value === APP_PIN) {
      onUnlock();
    } else {
      setError(true);
      void shake.start({
        x: [0, -9, 9, -6, 6, 0],
        transition: { duration: 0.4 },
      });
      setDigits(Array(PIN_LENGTH).fill(""));
      focusCell(0);
    }
  };

  const handleChange = (i: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setDigits((d) => {
        const next = [...d];
        next[i] = "";
        return next;
      });
      return;
    }
    setError(false);

    // Support pasting / autofill of the whole code into one cell.
    if (cleaned.length > 1) {
      const spread = cleaned.slice(0, PIN_LENGTH).split("");
      const next = Array(PIN_LENGTH)
        .fill("")
        .map((_, idx) => spread[idx] ?? "");
      setDigits(next);
      const filled = next.filter(Boolean).length;
      focusCell(Math.min(filled, PIN_LENGTH - 1));
      if (next.every(Boolean)) attempt(next.join(""));
      return;
    }

    setDigits((d) => {
      const next = [...d];
      next[i] = cleaned;
      if (next.every(Boolean)) {
        // Defer so the final digit paints before we judge it.
        queueMicrotask(() => attempt(next.join("")));
      }
      return next;
    });
    if (i < PIN_LENGTH - 1) focusCell(i + 1);
  };

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      focusCell(i - 1);
      setDigits((d) => {
        const next = [...d];
        next[i - 1] = "";
        return next;
      });
    }
  };

  return (
    <div className="relative mt-10">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.22em] text-ink-dim uppercase">
          Enter your PIN
        </p>
        <span className="flex items-center gap-1 text-[11px] font-medium text-ink-faint">
          <Icon name="lock" size={13} variant="fill" color="currentColor" />
          Private
        </span>
      </div>

      <motion.div animate={shake} className="mt-3 flex justify-between gap-2.5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="tel"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={PIN_LENGTH}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            aria-label={`PIN digit ${i + 1}`}
            className={`h-16 w-full rounded-2xl bg-surface text-center text-3xl font-bold tabular-nums text-ink caret-tennis-700 ring-1 ring-inset transition-colors focus:outline-none ${
              error
                ? "ring-2 ring-angie-400"
                : d
                  ? "ring-2 ring-tennis-500/50"
                  : "ring-line focus-visible:ring-tennis-500/40"
            }`}
          />
        ))}
      </motion.div>

      <div className="mt-2 h-4">
        {error ? (
          <p className="text-center text-xs font-bold text-angie-500">
            Not quite. Try again.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => attempt(pin)}
        disabled={!complete}
        className="pressable mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-tennis-300 py-4 text-base font-bold text-ink ring-1 ring-inset ring-tennis-500/30 shadow-[0_22px_50px_-12px_oklch(0.7_0.2_120_/_0.45)] transition-opacity disabled:opacity-40"
      >
        <Icon name="lock_open" size={22} color="var(--color-ink)" />
        Launch app
      </button>
    </div>
  );
}

function Feature({
  icon,
  label,
  sub,
}: {
  icon: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset ring-line">
      <div className="flex size-8 items-center justify-center rounded-xl bg-tennis-100 text-tennis-800">
        <Icon name={icon} size={20} color="currentColor" />
      </div>
      <p className="mt-1 text-[12px] leading-tight font-bold text-ink">
        {label}
      </p>
      <p className="text-[10px] leading-tight text-ink-dim">{sub}</p>
    </div>
  );
}

function Splash() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -top-32 -right-32 size-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-tennis-200) 0%, transparent 100%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="absolute top-[28rem] -left-32 size-[380px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.86 0.16 12 / 0.18) 0%, transparent 100%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="absolute top-[14rem] -right-24 size-[280px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.7 0.18 254 / 0.16) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
