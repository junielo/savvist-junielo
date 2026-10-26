# Savvist — Architecture Documentation

This document outlines the architectural patterns, structural design, reactivity model, and technical standards used across the Savvist monorepo application.

---

## 1. Architectural Overview

Savvist is built as a modern full-stack personal finance application structured as an **Nx Monorepo**. It features:
- **Frontend (`apps/savvist-frontend`):** Built with **Angular 22**, emphasizing strict modularity, high performance via **Zoneless Change Detection**, and fine-grained reactivity powered entirely by **Angular Signals**.
- **Backend (`apps/savvist-backend`):** Built with **NestJS 11**, providing a structured, modular REST API communicating with MongoDB.

Key architectural tenets:
- **Standalone Components Only (Frontend):** Zero use of `NgModule`. Every component, directive, and pipe is standalone and explicitly imports its dependencies.
- **Zoneless Operation (Frontend):** Zone.js is omitted. UI updates are driven deterministically by signal notifications and reactive primitives.
- **Feature-Based Vertical Slicing:** Domain logic is organized into self-contained feature modules, supported by global singletons (`core`) and reusable primitives (`shared`).
- **Strict Layering & Dependency Boundaries:** Clear directional dependencies prevent circular imports and tight coupling.

---

## 2. Directory Structure & Layering

The monorepo workspace is organized as follows:

```
savvist-junielo/
├── apps/
│   ├── savvist-backend/     # NestJS REST API application
│   └── savvist-frontend/    # Angular 22 SPA application
├── docs/                    # Architecture, database, and project documentation
└── package.json             # Root workspace configuration
```

---

## 3. Frontend Project Structure (`apps/savvist-frontend`)

The frontend source code is located under `apps/savvist-frontend/src/app/`. Below is the detailed directory and file breakdown with their respective descriptions:

```
apps/savvist-frontend/src/app/
├── app.config.ts            # Application-wide providers (router, HTTP interceptors, zoneless change detection)
├── app.html                 # Root application HTML template
├── app.routes.ts            # Root router configuration defining lazy-loaded feature routes
├── app.scss                 # Global application styles and SCSS entry point
├── app.spec.ts              # Unit tests for the root application component
├── app.ts                   # Root application component class
├── core/                    # Global singletons and application-wide infrastructure
│   └── layout/              # Persistent shell layout components
│       ├── shell/           # Main container layout (sidebar + top-bar + router outlet)
│       ├── sidebar/         # Responsive navigation sidebar drawer
│       └── top-bar/         # Header bar with base salary display/edit and global actions
├── features/                # Vertical feature modules encapsulating domain logic
│   ├── chat/                # AI assistant chat interface feature
│   │   ├── chat.routes.ts   # Chat feature routing module
│   │   └── pages/           # Chat page views
│   ├── dashboard/           # Financial metrics, gauges, line charts, and overview
│   │   ├── dashboard.routes.ts# Dashboard feature routing
│   │   ├── components/      # Dashboard-specific widgets
│   │   │   ├── apex-gauge-label/ # Custom gauge label component
│   │   │   ├── apex-line-chart/  # ApexCharts trend line chart component
│   │   │   ├── apex-table-data/  # Financial data table summary widget
│   │   │   └── card-computed-amount/ # Computed amount stat card component
│   │   └── pages/           # Dashboard page views
│   ├── expenses/            # Recurring and monthly expense management
│   │   ├── expenses.routes.ts# Expenses feature routing
│   │   ├── components/      # Expense list item widgets
│   │   │   └── expense-list-item/
│   │   ├── dialogs/         # Expense creation/editing dialogs
│   │   │   └── expense-dialog/
│   │   ├── models/          # Expense-specific TypeScript models and interfaces
│   │   │   └── expense-list-tem.ts
│   │   └── pages/           # Expenses page views
│   ├── record-logs/         # Read-only audit log of financial events
│   │   ├── record-logs.routes.ts # Record logs feature routing
│   │   ├── components/      # Record list item widgets
│   │   │   └── record-list-item/
│   │   └── pages/           # Record logs page views
│   │       └── resize-observer-polyfill.ts # ResizeObserver helper for responsive tables
│   └── wishlist/            # Priority-ranked wishlist purchases
│       ├── wishlist.routes.ts # Wishlist feature routing
│       ├── components/      # Wishlist item display widgets
│       │   └── wishlist-list-item/
│       ├── dialogs/         # Wishlist management dialogs
│       │   └── wishlist-dialog/
│       ├── models/          # Wishlist data types and interfaces
│       │   ├── wishlist-list-item.ts
│       │   └── wishlist-type.ts
│       └── pages/           # Wishlist page views
└── shared/                  # Domain-free, reusable UI primitives and utilities
    ├── charts/              # Generic chart wrappers
    │   └── basic-radial-bar/# Radial bar progress chart component
    ├── layout/              # Reusable layout primitives
    │   ├── aria-select/     # Accessible custom select dropdown component
    │   └── dialog-shell/    # Reusable modal dialog shell wrapper
    ├── models/              # Shared types and utility interfaces
    │   └── aria-select-option.ts
    └── pipes/               # Custom formatting pipes
        └── ordinal-pipe.ts  # Pipe for formatting ordinal days (e.g., 21st)
```

### Frontend Dependency Rules
1. **Features** may import from `core` and `shared`, but **never** from another feature.
2. **Shared** is domain-free and must **never** import from `features` or `core`.
3. **Core** houses singletons and infrastructure used across features.

---

## 4. Backend Project Structure (`apps/savvist-backend`)

The backend source code is located under `apps/savvist-backend/src/`. Below is the detailed directory and file breakdown with their respective descriptions:

```
apps/savvist-backend/src/
├── main.ts                  # NestJS application bootstrap, global prefix ('api'), and NX ready-signal integration
├── assets/                  # Static assets storage directory
└── app/                     # Root application module and core REST domain modules
    ├── app.controller.spec.ts # Unit tests for the root controller
    ├── app.controller.ts    # Root application controller handling base health / API root endpoint
    ├── app.module.ts        # Root NestJS module (`AppModule`) importing domain features and providers
    ├── app.service.spec.ts  # Unit tests for the root service
    ├── app.service.ts       # Root application service implementing core root business logic
```

### NestJS Backend Architectural Standards
1. **Module-Based Encapsulation:** Each domain feature is organized into dedicated NestJS modules containing controllers, services, and Mongoose schema models.
2. **Controller Layer:** Handles HTTP request routing, DTO validation using NestJS validation pipes, and response serialization.
3. **Service Layer:** Encapsulates business logic, database queries (MongoDB/Mongoose), and domain calculations (e.g., computed totals, allowance, fund tracking).
4. **Data Models / Schemas:** Mongoose schemas defining collection documents corresponding to the database architecture (`users`, `accountEntries`, `entryRecords`, `expenses`, `wishlistItems`, `recordLogs`, `conversations`, `messages`).

---

## 5. Reactivity & State Management (Frontend)

Savvist leverages Angular 22's modern reactive primitives for state management and UI synchronization:

- **Signals (`signal`, `computed`, `linkedSignal`):** Used for synchronous local and global state. `linkedSignal` handles derived states that require mutable overrides.
- **Signal-Based Component API:** Components use `input`, `input.required`, `output`, `model`, `viewChild`, and `contentChild` in place of legacy decorators (`@Input`, `@Output`, `@ViewChild`).
- **Asynchronous Resources (`resource`, `rxResource`, `httpResource`):** Used for data fetching, loading states, and error handling, providing reactive `params`, `status`, `value`, and `reload` handles.
- **Side Effects Control:**
  - `effect()` is strictly reserved for true side effects (e.g., syncing with storage or logging).
  - `afterNextRender` and `afterRenderEffect` manage DOM-touching operations such as initializing ApexCharts or auto-scrolling chat threads.

---

## 6. Routing & Navigation

Routing is configured in `app.routes.ts` using lazy loading and component input binding:

- **Parent Shell Route:** The root path `''` loads the persistent `Shell` component, which hosts the sidebar, top-bar, and a `<router-outlet>`.
- **Lazy Feature Routes:** Feature modules are loaded asynchronously via `loadChildren`:
  - `/dashboard` → `dashboard.routes.ts`
  - `/chat` → `chat.routes.ts`
  - `/expenses` → `expenses.routes.ts`
  - `/wishlist` → `wishlist.routes.ts`
  - `/record-logs` → `record-logs.routes.ts`
- **Route Parameters & Data:** Route parameters are bound directly to component inputs. Route titles and metadata update the browser title and top bar heading dynamically.

---

## 7. Forms & Validation

Form handling utilizes **Signal Forms** (`@angular/forms/signals`):
- Declarative `form()` schemas with built-in and custom validators.
- Cross-field validation rules and conditional `disabled`, `hidden`, and `readonly` states.
- Custom form controls built on `FormValueControl` and `FormCheckboxControl` (replacing legacy ControlValueAccessor) for pill dropdowns, month-chip multi-selects, and currency inputs.

---

## 8. Data Layer & Backend Integration

- **Repository Pattern:** Data operations are defined via abstract classes in `core/data/` acting as dependency injection tokens.
- **NestJS REST API Backend:** Backed by NestJS (`savvist-backend`), providing modular controllers and services for users, accounts, entry records, expenses, wishlist items, record logs, and chat conversations.
- **HTTP Client:** Configured with the fetch backend and functional interceptors for base URL injection, error normalization, and read retries. During development, API requests under `/api` are proxied via `proxy.conf.json` to the NestJS backend.

---

## 9. Testing & Quality Assurance

- **Frontend Testing:** **Vitest** configured via Angular CLI test builder, running component tests in zoneless mode with Material component harnesses.
- **Backend Testing:** **Jest** configured for NestJS unit and e2e testing.
- **Code Quality:** Enforced via `angular-eslint`, TypeScript strict mode, and Prettier formatting rules.
- **Bundle Budgets:** Defined in `angular.json` to monitor frontend bundle size and prevent regressions.
