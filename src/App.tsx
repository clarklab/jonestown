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

export function App() {
  const location = useLocation();
  const status = useCoupleStatus();
  const navigate = useNavigate();

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
        <AnimatePresence initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/claim" element={<ClaimPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Couple is set — full app.
  return (
    <div className="relative flex min-h-dvh flex-col bg-paper text-ink">
      <main className="flex-1 pb-32">
        <AnimatePresence initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
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
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar />
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-tennis-300 ring-1 ring-inset ring-black/5">
        <span className="display-tight text-[22px] leading-none">J</span>
      </div>
    </div>
  );
}
