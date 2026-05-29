import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon";

interface Toast {
  id: number;
  message: string;
  icon: string;
  tone: "success" | "info";
}

interface ToastApi {
  show: (
    message: string,
    opts?: { icon?: string; tone?: Toast["tone"]; duration?: number },
  ) => void;
}

const ToastCtx = createContext<ToastApi>({ show: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const show = useCallback<ToastApi["show"]>((message, opts) => {
    const id = performance.now() + Math.random();
    const toast: Toast = {
      id,
      message,
      icon: opts?.icon ?? "check_circle",
      tone: opts?.tone ?? "success",
    };
    setToasts((t) => [...t, toast]);
    const timer = setTimeout(
      () => {
        setToasts((t) => t.filter((x) => x.id !== id));
        timersRef.current.delete(id);
      },
      opts?.duration ?? 2200,
    );
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t);
    };
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-3"
        style={{
          top: "max(env(safe-area-inset-top, 0.75rem), 0.75rem)",
        }}
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-ink py-2.5 pr-4 pl-3 text-sm font-bold text-paper shadow-[0_18px_40px_-12px_oklch(0_0_0_/_0.5)] ring-1 ring-inset ring-white/10"
            >
              <Icon
                name={t.icon}
                size={18}
                variant="fill"
                color={
                  t.tone === "success"
                    ? "var(--color-tennis-300)"
                    : "var(--color-paper)"
                }
              />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
