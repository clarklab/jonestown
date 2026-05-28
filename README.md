# Jonestown

> we eatin

A private restaurant review club for Clark & Angie. Aggregate-rate every restaurant in Jonestown, TX 78645.

Web-only PWA. Mobile-first. Add-to-homescreen. All data stored locally in IndexedDB (photos and all).

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- IndexedDB via `idb` (restaurants, visits, dishes, photos)
- Framer Motion for spring-physics animation
- OGL for WebGL accents
- `vite-plugin-pwa` for installable PWA + offline
