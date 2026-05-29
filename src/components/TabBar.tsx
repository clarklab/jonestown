import { motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "./Icon";

const tabs = [
  { to: "/", label: "Map", icon: "map", end: true },
  { to: "/log", label: "Log", icon: "menu_book", end: false },
  { to: "/me", label: "Me", icon: "account_circle", end: false },
] as const;

export function TabBar() {
  const location = useLocation();
  const onAddRoute = location.pathname.startsWith("/add");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <div className="relative mx-auto flex max-w-md items-end justify-around rounded-[28px] bg-surface/95 backdrop-blur-xl ring-1 ring-inset ring-line shadow-[0_18px_60px_-20px_oklch(0_0_0_/_0.25)]">
        <TabItem tab={tabs[0]} />
        <div className="relative flex w-20 justify-center">
          <NavLink
            to="/add"
            aria-label="Log a visit"
            className="pressable -mt-7 flex size-16 items-center justify-center rounded-full bg-tennis-300 ring-2 ring-paper shadow-[0_18px_40px_-12px_oklch(0.7_0.2_120_/_0.6)]"
          >
            <motion.span
              initial={false}
              animate={{ rotate: onAddRoute ? 45 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              className="flex items-center justify-center"
            >
              <Icon name="add" size={32} weight={200} color="var(--color-ink)" />
            </motion.span>
            <span
              className="pointer-events-none absolute inset-0 -m-2 rounded-full"
              aria-hidden="true"
            />
          </NavLink>
        </div>
        <TabItem tab={tabs[1]} />
        <TabItem tab={tabs[2]} />
      </div>
    </nav>
  );
}

function TabItem({ tab }: { tab: (typeof tabs)[number] }) {
  return (
    <NavLink
      to={tab.to}
      end={tab.end}
      className={({ isActive }) =>
        `pressable group relative flex h-16 w-20 flex-col items-center justify-center gap-1 ${
          isActive ? "text-ink" : "text-ink-faint"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative flex items-center justify-center">
            <Icon
              name={tab.icon}
              size={26}
              variant={isActive ? "fill" : "outline"}
              weight={200}
              color="currentColor"
            />
            {isActive ? (
              <motion.span
                layoutId="tab-active-glow"
                className="absolute -inset-2 -z-10 rounded-full bg-tennis-200"
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              />
            ) : null}
          </span>
          <span className="text-[10px] font-bold tracking-wide">
            {tab.label}
          </span>
        </>
      )}
    </NavLink>
  );
}
