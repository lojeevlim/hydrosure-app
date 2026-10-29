# Hydrosure App

Web front end for the Hydrosure point-of-sale and inventory system: login (email/password or Google), dashboard, POS, products, categories and brands, inventory, suppliers and sales history. It talks to the separate `hydrosure-api` project over HTTP.

## Stack

- Vue 3 (script setup, TypeScript), Vue Router, Pinia
- Vite 8 and Tailwind CSS v4
- lojee-ui web components (`<l-*>` custom elements, pinned to `0.1.0-alpha.19`)
- axios, zod, dayjs, @vueuse/core, lucide icons (`lucide-vue-next`)
- `react`, `react-dom` and `lucide-react` are installed only because lojee-ui needs them; `vite.config.ts` dedupes them. The app itself has no React code.

Theme (light/dark) is owned by lojee-ui's `<l-theme-switcher>` and persisted by lojee-ui (`lojee-ui:*` localStorage keys); the app keeps no theme state of its own.

## Prerequisites

- Node.js (current LTS or newer) with npm
- A running `hydrosure-api` (default `http://localhost:4000/api`)

## Setup

```sh
npm install
cp .env.example .env   # optional, defaults work for local development
```

## Environment variables

All variables are optional and read at build/dev-server start (Vite `VITE_` prefix).

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:4000/api` | Base URL of the API |
| `VITE_CURRENCY` | `PHP` | ISO currency code used for formatting |
| `VITE_STORE_NAME` | `Lojee Store` | Store name on receipts (when the sale has none). Leave unset rather than empty to keep the default |
| `VITE_OPEN_HOUR` | `8` | Opening hour (0-23). The hourly sales chart on Today/Yesterday starts here |
| `VITE_CLOSE_HOUR` | `20` | Closing hour (0-23). The hourly sales chart ends at this hour (up to the current hour today) |
| `VITE_STORE_ADDRESS` | empty | Store address on receipts |
| `VITE_GOOGLE_CLIENT_ID` | unset | Google OAuth client ID. When set, the login page shows a "Continue with Google" button; when unset the button is hidden |

## Run

```sh
npm run dev                  # http://localhost:5173
npm run dev -- --port 5180   # custom port
```

The API only accepts requests from its configured `CORS_ORIGIN`. That value must equal the origin the web app is served from (for example `http://localhost:5180`), otherwise the browser blocks every request.

## Build

```sh
npm run build     # vue-tsc -b && vite build, output in dist/
npm run preview
```

The build currently reports a chunk-size warning (maplibre and the main bundle exceed 500 kB); it is not an error.

## Authentication

- Sign in with email and password, or with Google when `VITE_GOOGLE_CLIENT_ID` is set (the Google ID token is exchanged at `POST /auth/google`).
- Access and refresh tokens are stored in `localStorage` and attached to API calls by the axios client in `src/lib/api.ts`.
- On a `401` the client refreshes the tokens once (concurrent requests share a single refresh call) and retries. If the refresh fails, the user is sent to `/login` with a "signed out" toast and returned to the page they were on after signing in again.

## Folder layout

```
src/
  components/        App shell, dialogs, receipt, shared building blocks
    ui/              Thin Vue wrappers around lojee-ui custom elements (LButton, LInput, LTable, ...)
    pos/ products/ inventory/ sales/ catalog/ dashboard/   Feature-specific components
  pages/             One component per route
  stores/            Pinia stores (auth, cart)
  lib/               api (axios + token refresh), csv, format helpers, Google sign-in loader
  composables/       Reusable composition functions (toast, confirm, barcode scanner)
  types/             Local type declarations
  shared/            Zod schemas and types shared with the API (see below)
  router.ts, main.ts, App.vue, style.css, env.d.ts
```

`src/components/ui` wraps each `<l-*>` element so pages get typed props, `v-model` and events, and so lojee-ui quirks are handled in one place instead of in every page.

The import specifier `@hydrosure/shared` is kept for compatibility. It is resolved to `src/shared/index.ts` by `resolve.alias` in `vite.config.ts` and `paths` in `tsconfig.app.json`.

## lojee-ui 0.1.0-alpha.19 notes

- The `LTabs` and `LStat` wrappers inject styles into the components' shadow roots to fix layout.
- `LNumberInput` is built on `l-input`.
- Re-test these wrappers (and the dashboard card heights, tabs and number inputs) whenever lojee-ui is upgraded.

### Testing against a local lojee-ui

```sh
rm -rf node_modules/lojee-ui
ln -s /path/to/local/lojee-ui node_modules/lojee-ui
npx vite --force
```

Restore the pinned package afterwards:

```sh
rm node_modules/lojee-ui
npm install
```

Do not commit the symlink or change the pinned version for local testing.

## Roles and routes

| Route | Page | Roles |
| --- | --- | --- |
| `/login` | Sign in | public |
| `/` | Dashboard | admin, manager, cashier |
| `/pos` | POS | admin, manager, cashier |
| `/sales` | Sales history | admin, manager, cashier |
| `/products` | Products | admin, manager |
| `/catalog` | Categories and brands | admin, manager |
| `/inventory` | Inventory | admin, manager |
| `/suppliers` | Suppliers | admin, manager |

A user without the required role is redirected to `/pos` with a toast.

## POS shortcuts

| Key | Action |
| --- | --- |
| `F2` | Focus product search |
| `F4` | Open payment |
| `F8` | Hold cart |
| `Esc` | Close dialog |

A barcode scanner is always listening on the POS page.

## Shared schemas

`src/shared` is a copy of the API's `src/shared` (zod schemas and types). The source of truth is `hydrosure-api`. When the API schemas change, update this copy and rebuild:

```sh
cp -R ../hydrosure-api/src/shared/. src/shared/
npm run build
```
