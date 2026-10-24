# Savvist Frontend — Architecture Documentation

This document outlines the architectural patterns, structural design, reactivity model, and technical standards used in the Savvist frontend application.

---

## 1. Architectural Overview

Savvist is built as a modern, single-page personal finance application using **Angular 22**. The architecture emphasizes strict modularity, high performance via **Zoneless Change Detection**, and fine-grained reactivity powered entirely by **Angular Signals**.

Key architectural tenets:
- **Standalone Components Only:** Zero use of `NgModule`. Every component, directive, and pipe is standalone and explicitly imports its dependencies.
- **Zoneless Operation:** Zone.js is omitted. UI updates are driven deterministically by signal notifications and reactive primitives.
- **Feature-Based Vertical Slicing:** Domain logic is organized into self-contained feature modules, supported by global singletons (`core`) and reusable primitives (`shared`).
- **Strict Layering & Dependency Boundaries:** Clear directional dependencies prevent circular imports and tight coupling.

---

## 2. Directory Structure & Layering

The codebase is organized under `src/app/` following a strict layered architecture:

```
src/app/
├── core/                # Global singletons and application-wide infrastructure
│   ├── config/          # Application configuration and environment providers
│   ├── data/            # Repository contracts (abstract classes) and mock implementations
│   ├── dialogs/         # Global dialog helpers
│   ├── errors/          # Global error handling and normalization interceptors
│   ├── http/            # HttpClient setup and functional interceptors
│   ├── layout/          # Persistent shell layout components
│   │   ├── shell/       # Main container layout (sidebar + top-bar + router outlet)
│   │   ├── sidebar/     # Navigation drawer with CDK responsive breakpoints
│   │   └── top-bar/     # Header with base salary display/edit and global actions
│   └── state/           # Global application state stores (user profile, record logs)
│
├── shared/              # Domain-free, reusable UI primitives and utilities
│   ├── components/      # Generic widgets (dialog shell, confirm dialog, pill dropdown, etc.)
│   ├── pipes/           # Custom formatting pipes (ordinal day, currency, etc.)
│   └── utils/           # Shared helper functions and type definitions
│
└── features/            # Vertical feature slices
    ├── chat/            # AI Assistant chat interface and conversations state
    ├── dashboard/       # Financial metrics, gauges (Health/Growth), line chart, and summaries
    ├── expenses/        # Recurring and monthly expense management and dialogs
    ├── record-logs/     # Read-only audit log of all financial record changes
    └── wishlist/        # Priority-ranked wishlist purchases and management
```

### Dependency Rules
1. **Features** may import from `core` and `shared`, but **never** from another feature.
2. **Shared** is domain-free and must **never** import from `features` or `core`.
3. **Core** houses singletons and infrastructure used across features.
4. Feature-specific state and components remain encapsulated within their respective feature folder. Only state shared across multiple domains resides in `core/state`.

---

## 3. Reactivity & State Management

Savvist leverages Angular 22's modern reactive primitives for state management and UI synchronization:

- **Signals (`signal`, `computed`, `linkedSignal`):** Used for synchronous local and global state. `linkedSignal` handles derived states that require mutable overrides.
- **Signal-Based Component API:** Components use `input`, `input.required`, `output`, `model`, `viewChild`, and `contentChild` in place of legacy decorators (`@Input`, `@Output`, `@ViewChild`).
- **Asynchronous Resources (`resource`, `rxResource`, `httpResource`):** Used for data fetching, loading states, and error handling, providing reactive `params`, `status`, `value`, and `reload` handles.
- **Side Effects Control:**
  - `effect()` is strictly reserved for true side effects (e.g., syncing with storage or logging).
  - `afterNextRender` and `afterRenderEffect` manage DOM-touching operations such as initializing ApexCharts or auto-scrolling chat threads.

---

## 4. Routing & Navigation

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

## 5. Forms & Validation

Form handling utilizes **Signal Forms** (`@angular/forms/signals`):
- Declarative `form()` schemas with built-in and custom validators.
- Cross-field validation rules and conditional `disabled`, `hidden`, and `readonly` states.
- Custom form controls built on `FormValueControl` and `FormCheckboxControl` (replacing legacy ControlValueAccessor) for pill dropdowns, month-chip multi-selects, and currency inputs.

---

## 6. Data Layer & Backend Integration

- **Repository Pattern:** Data operations are defined via abstract classes in `core/data/` acting as dependency injection tokens.
- **Mock vs. HTTP Implementations:** Currently backed by an in-memory mock repository for rapid frontend development and testing. Designed for seamless swapping with an HTTP-based repository communicating with a Node.js/Express and MongoDB backend.
- **HTTP Client:** Configured with the fetch backend and functional interceptors for base URL injection, error normalization, and read retries. During development, API requests under `/api` are proxied via `proxy.conf.json`.

---

## 7. Testing & Quality Assurance

- **Test Runner:** **Vitest** configured via Angular CLI test builder, running component tests in zoneless mode.
- **Component Harnesses:** Angular Material harnesses (`@angular/material/testing`) for robust, resilient UI interaction testing in unit specs.
- **Code Quality:** Enforced via `angular-eslint`, TypeScript strict mode, and Prettier formatting rules.
- **Bundle Budgets:** Defined in `angular.json` to monitor bundle size and prevent regressions.
