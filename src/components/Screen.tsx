import { useCallback, useEffect, useRef } from "react";
import {
  motion,
  useAnimationControls,
  type AnimationControls,
} from "framer-motion";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";

export type ScreenMode = "page" | "card";

type DismissFn = (to: To, opts?: NavigateOptions) => void;

export interface ScreenController {
  mode: ScreenMode;
  panel: AnimationControls;
  scrim: AnimationControls;
  /**
   * Navigate away, but play the screen's exit animation first. Falls through
   * to a plain navigate once the animation resolves.
   */
  dismiss: DismissFn;
}

// Matches the easing the rest of the app already leans on for arrivals
// (hero zoom, etc.) so transitions feel of a piece.
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

/**
 * Drives a page's enter/exit motion. Mounting plays the entrance; calling
 * `dismiss(to)` plays the matching exit *before* navigating, so leaving a
 * screen reads as a deliberate move rather than an instant route swap.
 *
 * Animations run through imperative AnimationControls rather than a
 * route-level <AnimatePresence>. A controls-driven tween can't be stranded by
 * an unrelated global re-render (a Toast appearing mid-transition, say) — the
 * exact failure that once left destination pages stuck at a blank opacity and
 * got the old page-fade ripped out.
 */
export function useScreen(mode: ScreenMode = "page"): ScreenController {
  const navigate = useNavigate();
  const panel = useAnimationControls();
  const scrim = useAnimationControls();
  const leaving = useRef(false);

  useEffect(() => {
    leaving.current = false;
    if (mode === "card") {
      void scrim.start({
        opacity: 1,
        transition: { duration: 0.3, ease: "linear" },
      });
      void panel.start({
        y: 0,
        transition: { duration: 0.46, ease: EASE_OUT },
      });
    } else {
      // Opacity-only on purpose: a lingering transform would become the
      // containing block for any `fixed` descendant (e.g. HomePage's
      // ShuffleModal), pinning it to the page instead of the viewport.
      void panel.start({
        opacity: 1,
        transition: { duration: 0.3, ease: EASE_OUT },
      });
    }
    // Mount-only: the entrance plays once, when the route first renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback<DismissFn>(
    (to, opts) => {
      // Guard against a double-tap firing two exits + two navigations.
      if (leaving.current) return;
      leaving.current = true;
      if (mode === "card") {
        void scrim.start({
          opacity: 0,
          transition: { duration: 0.26, ease: "linear" },
        });
        void panel
          .start({ y: "100%", transition: { duration: 0.32, ease: EASE_IN } })
          .then(() => navigate(to, opts));
      } else {
        void panel
          .start({
            opacity: 0,
            transition: { duration: 0.2, ease: EASE_IN },
          })
          .then(() => navigate(to, opts));
      }
    },
    [mode, navigate, panel, scrim],
  );

  return { mode, panel, scrim, dismiss };
}

/**
 * Renders the motion shell around a page's content. `card` mode is a
 * bottom-sheet that floats over a dimmed scrim; `page` mode is an inline
 * fade-and-rise that leaves document scrolling untouched.
 */
export function ScreenView({
  screen,
  children,
}: {
  screen: ScreenController;
  children: React.ReactNode;
}) {
  if (screen.mode === "card") {
    return (
      <>
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={screen.scrim}
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={screen.panel}
          className="fixed inset-x-0 top-3 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[28px] bg-paper shadow-[0_-24px_70px_-30px_oklch(0_0_0_/_0.5)]"
        >
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </motion.div>
      </>
    );
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={screen.panel}>
      {children}
    </motion.div>
  );
}
