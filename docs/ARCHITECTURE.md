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
│   ├── http/                # HTTP error and request interceptors
│   │   ├── api-error.ts     # Standardized API error interface
│   │   └── error.interceptor.ts # HTTP error handling interceptor
│   ├── layout/              # Persistent shell layout components & global dialogs
│   │   ├── dialogs/         # Core application dialogs
│   │   │   ├── add-entry-dialog/      # Dialog for adding account balances / entries
│   │   │   ├── create-entry-dialog/   # Dialog for creating/editing account entries
│   │   │   └── user-profile-dialog/   # Dialog for managing user salary / profile settings
│   │   ├── shell/           # Main container layout (sidebar + top-bar + router outlet)
│   │   ├── sidebar/         # Responsive navigation sidebar drawer
│   │   └── top-bar/         # Header bar with base salary display/edit and global actions
│   ├── models/              # Global models and data types
│   │   ├── account-entry.ts # Account entry definitions
│   │   ├── entry-types.ts   # Entry type enums and definitions
│   │   └── user.ts          # User profile model
│   └── services/            # Global API communication services
│       ├── account-entries.service.ts # Account entries HTTP service
│       ├── entry-records.service.ts   # Entry records HTTP service
│       └── user.service.ts            # User profile HTTP service
├── features/                # Vertical feature modules encapsulating domain logic
│   ├── chat/                # AI assistant chat interface feature
│   │   ├── chat.routes.ts   # Chat feature routing module
│   │   └── pages/           # Chat page views (chat-page)
│   ├── dashboard/           # Financial metrics, gauges, line charts, and overview
│   │   ├── dashboard.routes.ts# Dashboard feature routing
│   │   ├── components/      # Dashboard-specific widgets
│   │   │   ├── apex-gauge-label/ # Custom gauge label component
│   │   │   ├── apex-line-chart/  # ApexCharts trend line chart component
│   │   │   ├── apex-table-data/  # Financial data table summary widget
│   │   │   └── card-computed-amount/ # Computed amount stat card component
│   │   ├── services/        # Dashboard services
│   │   │   └── cards-TAT.service.ts # Turnaround / metric computation service
│   │   └── pages/           # Dashboard page views
│   ├── expenses/            # Recurring and monthly expense management
│   │   ├── expenses.routes.ts# Expenses feature routing
│   │   ├── components/      # Expense list item widgets
│   │   │   └── expense-list-item/
│   │   ├── dialogs/         # Expense creation/editing dialogs
│   │   │   └── expense-dialog/
│   │   ├── models/          # Expense-specific TypeScript models and interfaces
│   │   │   ├── expense-list-tem.ts
│   │   │   └── expense.model.ts
│   │   ├── services/        # Expense HTTP service
│   │   └── pages/           # Expenses page views
│   ├── record-logs/         # Read-only audit log of financial events
│   │   ├── record-logs.routes.ts # Record logs feature routing
│   │   ├── components/      # Record list item widgets
│   │   │   └── record-list-item/
│   │   ├── models/          # Record log models
│   │   │   └── record-log-list-item-model.ts
│   │   └── pages/           # Record logs page views
│   └── wishlist/            # Priority-ranked wishlist purchases
│       ├── wishlist.routes.ts # Wishlist feature routing
│       ├── components/      # Wishlist item display widgets
│       │   └── wishlist-list-item/
│       ├── dialogs/         # Wishlist management dialogs
│       │   └── wishlist-dialog/
│       ├── models/          # Wishlist data types and interfaces
│       │   ├── wishlist-list-item.ts
│       │   └── wishlist-type.ts
│       ├── services/        # Wishlist HTTP service
│       └── pages/           # Wishlist page views
└── shared/                  # Domain-free, reusable UI primitives and utilities
    ├── charts/              # Generic chart wrappers
    │   └── basic-radial-bar/# Radial bar progress chart component
    ├── layout/              # Reusable layout primitives
    │   ├── aria-select/     # Accessible custom select dropdown component
    │   ├── dialog-shell/    # Reusable modal dialog shell wrapper
    │   └── shared-dialog/   # Reusable confirmation, alert, warning, error dialog component
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
    ├── app.controller.ts    # Root application controller handling base health / API root endpoint
    ├── app.module.ts        # Root NestJS module (`AppModule`) importing domain features and providers
    ├── app.service.ts       # Root application service implementing core root business logic
    ├── common/              # Common decorators, guards, filters, and interceptors
    │   ├── current-user/    # Current user decorator and authentication guard
    │   │   ├── current-user.decorator.ts # Custom decorator to extract authenticated user
    │   │   └── current-user.guard.ts     # Guard validating user context
    │   ├── filters/         # HTTP exception and error filters
    │   │   └── http-exception.filter.ts  # Global HTTP exception normalization filter
    │   └── pipes/           # Validation and utility pipes
    │       └── parse-object-id.pipe.ts   # MongoDB ObjectId validation pipe
    ├── config/              # Configuration schemas and environment validation
    │   ├── configuration.ts # Application configuration factory
    │   └── env.validation.ts# Environment variables validation schema
    ├── database/            # Database configuration and transaction management services
    │   ├── database.module.ts # Mongoose database configuration and connection module
    │   └── transaction.service.ts # Transaction management service for database multi-document sessions
    └── modules/             # Domain feature modules
        ├── account-entries/ # Account entries management
        │   ├── account-entries.controller.ts # REST controller for account entries
        │   ├── account-entries.module.ts     # NestJS module for account entries
        │   ├── account-entries.service.ts    # Business logic service for account entries
        │   ├── dto/         # Data transfer objects for account entries
        │   │   ├── create-account-entry.dto.ts
        │   │   ├── find-account-entries.dto.ts
        │   │   └── update-account-entry.dto.ts
        │   ├── entities/    # Domain entities
        │   │   └── account-entry.entity.ts
        │   └── schemas/     # Mongoose schemas
        │       └── account-entry.schema.ts
        ├── chat/            # AI assistant chat interface backend module
        │   ├── chat.module.ts # NestJS module for chat feature
        │   ├── agent/       # AI agent integration and processing service
        │   │   └── agent.service.ts
        │   ├── conversations/ # Conversation management
        │   │   ├── conversations.controller.ts
        │   │   ├── conversations.module.ts
        │   │   └── conversations.service.ts
        │   └── messages/    # Chat message handling
        │       ├── messages.controller.ts
        │       ├── messages.module.ts
        │       └── messages.service.ts
        ├── daily-metrics/   # Daily financial metrics calculations and tracking
        │   ├── daily-metrics.module.ts
        │   └── daily-metrics.service.ts
        ├── dashboard/       # Dashboard metrics and summary aggregation
        │   ├── dashboard.controller.ts
        │   ├── dashboard.module.ts
        │   └── dashboard.service.ts
        ├── entry-records/   # Entry records management (audit logs/financial records)
        │   ├── entry-records.controller.ts
        │   ├── entry-records.module.ts
        │   └── entry-records.service.ts
        │   ├── dto/         # Data transfer objects
        │   │   ├── delete-balance.dto.ts
        │   │   └── find-entry-records.dto.ts
        │   ├── entities/    # Domain entities
        │   │   └── entry-record.entity.ts
        │   └── schemas/     # Mongoose schemas
        │       └── entry-record.schema.ts
        ├── expenses/        # Recurring and monthly expense tracking
        │   ├── expenses.controller.ts
        │   ├── expenses.module.ts
        │   ├── expenses.service.ts
        │   ├── dto/         # Data transfer objects for expenses
        │   │   ├── create-expense.dto.ts
        │   │   └── update-expense.dto.ts
        │   ├── entities/    # Mongoose schema entities for expenses
        │   │   └── expense.entity.ts
        │   └── schemas/     # Mongoose schemas
        │       └── expense.schema.ts
        ├── record-logs/     # Financial event and action record logging
        │   ├── record-logs.controller.ts
        │   ├── record-logs.module.ts
        │   └── record-logs.service.ts
        ├── users/           # User profile and management module
        │   ├── users.controller.ts
        │   ├── users.module.ts
        │   ├── users.service.ts
        │   ├── dto/         # DTOs
        │   │   └── update-user.dto.ts
        │   └── schemas/     # Mongoose schemas
        │       └── user.schema.ts
        └── wishlist/        # Priority-ranked wishlist purchases
            ├── wishlist.controller.ts
            ├── wishlist.module.ts
            ├── wishlist.service.ts
            ├── dto/         # Data transfer objects
            │   ├── create-wishlist.dto.ts
            │   ├── update-wishlist.dto.ts
            │   └── update-wishlist-type.dto.ts
            ├── entities/    # Domain entities
            │   └── wishlist.entity.ts
            └── schemas/     # Mongoose schemas
                └── wishlist.schema.ts
```

### NestJS Backend Architectural Standards
1. **Module-Based Encapsulation:** Each domain feature is organized into dedicated NestJS modules containing controllers, services, and Mongoose schema models.
2. **Controller Layer:** Handles HTTP request routing, DTO validation using NestJS validation pipes, and response serialization.
3. **Service Layer:** Encapsulates business logic, database queries (MongoDB/Mongoose), and domain calculations (e.g., computed totals, allowance, fund tracking).
4. **Data Models / Schemas:** Mongoose schemas defining collection documents corresponding to the database architecture (`users`, `accountEntries`, `entryRecords`, `expenses`, `wishlistItems`, `recordLogs`, `dailyMetrics`, `conversations`, `messages`).

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
- **NestJS REST API Backend:** Backed by NestJS (`savvist-backend`), providing modular controllers and services for users, account entries, entry records, expenses, wishlist items, record logs, the dashboard, and chat conversations.
- **HTTP Client:** Configured with the fetch backend and functional interceptors for base URL injection, error normalization, and read retries. During development, API requests under `/api` are proxied via `proxy.conf.json` to the NestJS backend.

---

## 9. Testing & Quality Assurance

- **Frontend Testing:** **Vitest** configured via Angular CLI test builder, running component tests in zoneless mode with Material component harnesses.
- **Backend Testing:** **Jest** configured for NestJS unit and e2e testing.
- **Code Quality:** Enforced via `angular-eslint`, TypeScript strict mode, and Prettier formatting rules.
- **Bundle Budgets:** Defined in `angular.json` to monitor frontend bundle size and prevent regressions.
