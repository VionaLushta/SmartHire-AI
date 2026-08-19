# SmartHire AI Frontend

React 19 + Vite frontend for SmartHire AI.

## What Lives Here

- `src/routes` - route registration and guards
- `src/layouts` - page shells
- `src/pages` - route-level screens
- `src/components` - reusable UI and feature components
- `src/redux` - store and slices
- `src/services` - API and auth helpers
- `src/context` - theme and notification providers
- `src/hooks` - shared hooks
- `src/utils` - helper functions
- `src/styles` - global styling

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Useful Commands

```bash
npm run lint
npm run build
npm run preview
```

## Notes

- Configure `VITE_API_URL` before running the app.
- Frontend environment variables are exposed to the browser bundle, so do not store secrets there.
- Reuse shared components before adding new UI primitives.
