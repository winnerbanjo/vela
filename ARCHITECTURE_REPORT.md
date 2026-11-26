# Vela Repository Architecture Report

**Reviewed:** 26 November 2026

## Executive summary

This repository contains two overlapping Vela web applications rather than one unified stack:

1. A **root-level static HTML/CSS/JavaScript site** served by a small, dependency-free Node HTTP server. That server also owns a large, hand-routed demo/integration API.
2. A **React + TypeScript single-page application** in `client/`, with marketing pages, authentication screens, merchant dashboard, customer storefront, and admin routes. It expects a separate REST API on port `5050`; that backend implementation is not present in this repository.

The two surfaces have different routes, APIs, and runtime ports. `VELA_PRD.md` describes broader product goals, but should be read as product intent rather than proof that those capabilities are implemented end-to-end.

## System map

```text
Browser
  ├─ Root static site / legacy workspace
  │    └─ server.js :3030
  │         ├─ serves root HTML/CSS/JS/assets and clean-route aliases
  │         └─ forwards /api/* to server_api.js
  │              └─ JSON files under data/ + in-memory demo helpers
  │
  └─ React application
       └─ Vite dev server :3002 (configured :3000)
            └─ /api proxy → localhost:5050
                 └─ REST backend is external to this repo
```

## Root static application and API

- **Entry point:** `server.js`. It uses Node’s built-in `http`, `fs`, and `path` modules; there is no root `package.json` or root dependency install step.
- **Site content:** Root HTML files, `styles.css`, `script.js`, and `assets/`. The site covers landing/marketing, pricing, FAQs, legal, login/register, dashboard workspace, storefront, and knowledge base. Some clean routes also have mirrored directory `index.html` files.
- **Routing:** `server.js` maps clean URLs such as `/pricing`, `/login`, `/dashboard`, and `/storefront` to root HTML files; `/p/...` and `/knowledge-base/...` are mapped to their relevant page. It serves other files directly and returns an HTML 404 page for missing files.
- **API boundary:** `/api/*` requests are passed to `handleApiRequest` in `server_api.js`. That module contains a large endpoint router for provider registry/apps, credential setup, payment checkout/verification/webhooks, calendar availability, transactions/ledger, galleries, Dropbox-like photo operations, and WhatsApp demo flows.
- **State:** The API seeds representative app/provider and transaction records in source. It reads/writes JSON state files beneath `data/` (including merchant-scoped app/transaction/gallery/thread files) and keeps some helper state in memory. This is file-backed demo/service state, not a database-backed persistence layer.
- **Credential handling:** Saved provider credentials are encrypted with AES-256-GCM using a key derived from `CREDENTIALS_SECRET`; without that variable, the source falls back to a fixed development key. Configure a strong secret before treating this as production credential storage.
- **Integrations:** The provider registry describes 15 providers. The running registry/apps endpoints return seeded/demo state. A provider appearing as connected in those records does not by itself establish a live external integration.

## React application (`client/`)

- **Stack:** React 18, TypeScript, Vite, React Router, TanStack React Query, Tailwind CSS, and component utilities including Lucide icons and Framer Motion.
- **Bootstrap and navigation:** `src/main.tsx` mounts the app under React Query and `BrowserRouter`; `src/App.tsx` defines marketing/legal/ecosystem, login/register/OTP, public storefront/checkout, merchant dashboard, and admin route groups. Dashboard and admin routes use separate layouts, protected-route components, and lazy-loaded pages. `SubdomainRouter`/host checks support merchant storefront routing.
- **API/data access:** `src/lib/api.ts` centralizes typed `fetch` calls for auth, schedule, service categories/services, bookings, payments, dashboard, staff, domains, portfolio, reviews, and admin operations. Requests attach a bearer token read from `localStorage`, include credentials, and use request timeouts. React Query is used by screens for server data.
- **Authentication:** `AuthContext` hydrates cached user data from `localStorage`, validates a saved token through `/auth/me`, and manages login/register/logout. Protected merchant/admin routes gate UI based on user role and auth state.
- **Browser-local state:** Some settings, onboarding flags, dashboard task/history data, and cached user information are persisted in browser storage. This is distinct from the root API’s JSON state.
- **API server expectation:** `vite.config.ts` configures `/api` → `http://localhost:5050`. In local development, `src/lib/api.ts` uses `/api`; deployed builds default to `https://api.nilebooking.co/api` unless `VITE_API_BASE_URL` is set.
- **Deployment:** `client/vercel.json` rewrites all routes to the SPA entry for client-side routing and sets cache/security headers. This is separate from the root Node server deployment/configuration.

## Important architecture boundary

The React client’s API contract (for example `/api/auth/me`, `/api/services`, `/api/bookings`, and `/api/admin/...`) is not implemented by `server_api.js`, whose routes are a different set (for example `/api/registry`, `/api/apps`, `/api/payments/checkout`, and `/api/calendar/availability`). The React client therefore depends on a separate backend. The proxy target on `5050` answered during this review, but that service is not defined or started by this repository. A local 401 response from its `/api/auth/me` endpoint confirms reachability only; it does not establish that the React backend is part of this codebase or that authenticated flows work.

## Local startup and verification

Both available frontends were started and left running:

- **Root site + root API:** [http://localhost:3030/](http://localhost:3030/) — started with `node server.js`.
- **React/Vite app:** [http://localhost:3002/](http://localhost:3002/) — started from `client/` with `npm run dev -- --host 0.0.0.0`. Vite selected `3002` because `3000` and `3001` were already occupied.
- **React API proxy:** configured for `localhost:5050`; a request to `/api/auth/me` returned `401 {"message":"Not authorized, no token"}` from the reachable service.

Verified during this review:

- Root `GET /` returned **200** with HTML.
- Root `GET /api/registry` returned **200** and 15 provider records.
- Root `GET /api/apps` returned **200** with 9 connected and 6 discoverable seeded app records.
- Root `GET /api/admin/diagnostics` returned **200** and `partial_configuration` (expected without configured integration secrets).
- React dev server `GET /` returned **200** and its Vite entry point.
- `npm ci --no-audit --no-fund` and `npm run build` in `client/` completed successfully. The build reported existing warnings for a stale Browserslist database, a mixed static/dynamic import, and a large JavaScript chunk.

## Practical takeaways

- Treat `client/` as the primary modular product UI and identify/document its intended external API service before attempting full local product flows.
- Treat root `server.js`/`server_api.js` as a separate legacy/static surface and integration prototype unless product owners confirm it remains authoritative.
- Before production use, replace demo defaults, supply real secrets and public URLs, and review persistence, authentication/authorization, webhook verification, and operational deployment as a coherent system.
