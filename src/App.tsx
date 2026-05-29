import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { TabBar } from "./components/TabBar";
import { HomePage } from "./pages/HomePage";
import { RestaurantPage } from "./pages/RestaurantPage";
import { AddVisitPage } from "./pages/AddVisitPage";
import { LogPage } from "./pages/LogPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AddRestaurantPage } from "./pages/AddRestaurantPage";
import { AddDishPage } from "./pages/AddDishPage";
import { ClaimPage } from "./pages/ClaimPage";
import { JoinPage } from "./pages/JoinPage";
import { LandingPage } from "./pages/LandingPage";
import { getCurrentCoupleId, onChange } from "./data/db";

type CoupleStatus = "loading" | "missing" | "present";

function useCoupleStatus(): CoupleStatus {
  const [status, setStatus] = useState<CoupleStatus>("loading");
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const id = await getCurrentCoupleId();
      if (!alive) return;
      setStatus(id ? "present" : "missing");
    };
    check();
    const off = onChange((table) => {
      if (table === "couples" || table === "meta") check();
    });
    return () => {
      alive = false;
      off();
    };
  }, []);
  return status;
}

/**
 * Scroll the window back to the top on every pathname change. Without this
 * the user lands mid-page when navigating between, say, a long restaurant
 * list and a restaurant detail.
 */
function useScrollResetOnRoute() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Run after paint so the new page has actually mounted.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    });
  }, [pathname]);
}

export function App() {
  const location = useLocation();
  const status = useCoupleStatus();
  const navigate = useNavigate();
  useScrollResetOnRoute();

  // Redirect into onboarding when no couple is selected (except on the
  // claim/join/landing routes themselves).
  useEffect(() => {
    if (status !== "missing") return;
    const allow = ["/", "/claim", "/join"];
    if (!allow.includes(location.pathname)) {
      navigate("/", { replace: true });
    }
  }, [status, location.pathname, navigate]);

  if (status === "loading") {
    return <SplashScreen />;
  }

  // No couple yet — landing flow without tab bar.
  if (status === "missing") {
    return (
      <div className="relative flex min-h-dvh flex-col bg-paper text-ink">
        <AnimatePresence mode="wait" initial={false}>
          <PageFrame key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/claim" element={<ClaimPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageFrame>
        </AnimatePresence>
      </div>
    );
  }

  // Couple is set — full app.
  return (
    <div className="relative flex min-h-dvh flex-col bg-paper text-ink">
      <main className="flex-1 pb-32">
        <AnimatePresence mode="wait" initial={false}>
          <PageFrame key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/r/:id" element={<RestaurantPage />} />
              <Route path="/r/:id/visit" element={<AddVisitPage />} />
              <Route path="/r/:id/dish/:visitId" element={<AddDishPage />} />
              <Route path="/add" element={<AddVisitPage />} />
              <Route path="/add/restaurant" element={<AddRestaurantPage />} />
              <Route path="/log" element={<LogPage />} />
              <Route path="/me" element={<ProfilePage />} />
              <Route path="/claim" element={<ClaimPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </PageFrame>
        </AnimatePresence>
      </main>
      <TabBar />
    </div>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

import { BrandTile } from "./components/BrandMark";

function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <BrandTile size={56} rounded={18} />
    </div>
  );
}
