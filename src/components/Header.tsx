import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { CoupleBadge, UserChip } from "./UserChip";
import { useCurrentCouple, useCurrentUser } from "~/data/hooks";
import { memberOf, type UserId } from "~/data/types";

export function Header({
  title,
  back,
  trailing,
  transparent = false,
}: {
  title?: string;
  back?: boolean;
  trailing?: React.ReactNode;
  transparent?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header
      className={`sticky top-0 z-30 flex items-center gap-3 px-4 pt-3 pb-3 ${
        transparent
          ? ""
          : "bg-paper/85 backdrop-blur-xl border-b border-line"
      }`}
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)",
      }}
    >
      {back ? (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="pressable relative -ml-1 flex size-10 items-center justify-center rounded-full bg-surface ring-1 ring-inset ring-line"
        >
          <Icon name="arrow_back" size={22} weight={600} color="var(--color-ink)" />
          <span
            className="pointer-events-none absolute inset-0 -m-2"
            aria-hidden="true"
          />
        </button>
      ) : (
        <BrandMark />
      )}
      <div className="min-w-0 flex-1">
        {title ? (
          <h1 className="display truncate text-lg text-ink">{title}</h1>
        ) : null}
      </div>
      {trailing ?? <UserPicker />}
    </header>
  );
}

function BrandMark() {
  const couple = useCurrentCouple();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <CoupleBadge size="md" />
      <div className="flex min-w-0 flex-col leading-none">
        <span className="display-tight truncate text-[18px] text-ink">
          {couple?.name ?? "Jonestown"}
        </span>
        <span className="truncate text-[10px] font-bold tracking-[0.16em] text-ink-dim uppercase">
          {couple?.town ?? "Two-fork supper club"}
        </span>
      </div>
    </div>
  );
}

export function UserPicker() {
  const couple = useCurrentCouple();
  const [user, setUser] = useCurrentUser();
  const [open, setOpen] = useState(false);
  const me = memberOf(couple, user);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Logging as ${me.name}`}
        onClick={() => setOpen((o) => !o)}
        className="pressable relative flex items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1 ring-1 ring-inset ring-line"
      >
        <UserChip id={user} size="sm" />
        <span className="text-xs font-bold text-ink">{me.name}</span>
        <span
          className="pointer-events-none absolute inset-0 -m-2"
          aria-hidden="true"
        />
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="absolute top-full right-0 z-40 mt-2 w-44 overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_30px_60px_-20px_oklch(0_0_0_/_0.25)]"
            >
              <div className="border-b border-line px-3 pt-2.5 pb-1.5 text-[10px] font-bold tracking-[0.18em] text-ink-dim uppercase">
                Logging as
              </div>
              {(["a", "b"] as UserId[]).map((slot) => {
                const m = memberOf(couple, slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setUser(slot);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                      user === slot ? "bg-tennis-100" : ""
                    }`}
                  >
                    <UserChip id={slot} size="md" />
                    <span className="flex-1 text-sm font-bold text-ink">
                      {m.name}
                    </span>
                    {user === slot ? (
                      <span
                        className="size-2 rounded-full"
                        style={{ background: m.accent }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
