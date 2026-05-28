import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import { TabBar } from "./components/TabBar";
import { HomePage } from "./pages/HomePage";
import { RestaurantPage } from "./pages/RestaurantPage";
import { AddVisitPage } from "./pages/AddVisitPage";
import { LogPage } from "./pages/LogPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AddRestaurantPage } from "./pages/AddRestaurantPage";
import { AddDishPage } from "./pages/AddDishPage";

export function App() {
  const location = useLocation();
  return (
    <div className="relative flex min-h-dvh flex-col bg-bg text-ink">
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
              <Route path="*" element={<HomePage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar />
    </div>
  );
}
