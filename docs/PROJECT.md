# Savvist — Project Description

A small personal finance tracker for managing funds, daily allowance, recurring expenses and a wishlist, with an AI assistant chat and an audit log of every record. Built as an Nx monorepo containing an Angular frontend and a NestJS backend.

---

## 1. Purpose

Savvist helps one user answer: *how much money do I have, how much can I spend today, and what is coming up?*

- Save money sources once as **account entries** (for example BDO, BPI, GCash), then record each account's **balance every day** as **entry records**.
- Track a **base salary** that feeds the balance shown in the top bar.
- Track **expenses** that repeat every month or apply only to chosen months.
- Track a **wishlist** of purchases ranked by priority, and mark items as bought.
- Chat with an **assistant** about finances, with multiple saved conversations.
- Review a read-only **record log** of everything that changed.
- See a **dashboard** with totals, today's allowance, health and growth gauges, and a trend chart.

## 2. Modules and screens

| Module | What it does |
|---|---|
| **Shell** | Persistent layout: left sidebar (Dashboard, Chat, Expenses, Wishlist, Record Logs) and a top bar with page title, base salary (click to edit) and "+ Add Amounts". |
| **Dashboard** | Welcome message, three stat cards (Total Fund, Actual Cash, Today's Allowance), two open-arc gauges (Health, Growth), a monthly line chart, and a divider list panel. |
| **Add Amounts dialog** | One dialog with two views: a list of saved accounts with an input for the selected day's balance on each (today by default, past days allowed with a warning that a new balance replaces the old one), plus edit and delete, and a create/edit form for an account (name and entry type: Cash, Credit, Savings). Accounts are created once, balances are entered daily. |
| **Base Salary dialog** | Salary input plus a "Currently unemployed" checkbox that disables the input and treats salary as zero. |
| **Expenses** | List with name, amount, ordinal day of month, recurrence badge, edit and delete. Footer shows total per month. The add/edit dialog has month chips: none selected means monthly, any selected means month-specific. |
| **Wishlist** | List with a pending-status icon, name, amount, inline priority dropdown (Priority, ASAP, Important, Normal, Peripheral), mark-as-bought, edit, delete. Footer shows total cost. |
| **Chat** | Message thread (user right, assistant left), pill composer with send button, and a right panel to add, rename, delete and select conversations. |
| **Record Logs** | Read-only table: Name, Amount, Record Type (Expense, Cash, Savings, Credit, Wishlist), Date. |

## 3. Tech stack

### Frontend (`apps/savvist-frontend`)
| Area | Choice |
|---|---|
| Framework | **Angular 22**, standalone components only |
| Language | TypeScript 6 (strict mode) |
| Runtime and tooling | Node 22+, Angular CLI 22, Nx 24, npm |
| UI components | **Angular Material** (Material 3 theming) and **Angular CDK** |
| Headless accessibility primitives | **Angular Aria** (`@angular/aria`) |
| Styling | **Pure SCSS** (`@use` / `@forward`, design tokens as CSS custom properties). No utility CSS frameworks. |
| Charts | **ApexCharts** via `ng-apexcharts` |
| Fonts and icons | Roboto and Material Symbols Outlined |
| Testing | **Vitest** (Angular's default runner), Material component harnesses |
| Code quality | ESLint with `angular-eslint`, Prettier |
| Dev server | Angular dev server with a proxy forwarding `/api` to the backend port |

### Backend (`apps/savvist-backend`)
| Area | Choice |
|---|---|
| Framework | **NestJS 11** |
| Language | TypeScript 6 (strict mode) |
| Database | MongoDB (ODM via Mongoose planned) |
| Architecture | Modular REST API under `/api` |
| Testing | Jest |

## 4. Angular features in use

### Core architecture
- **Standalone components, directives and pipes.** No NgModules.
- **Zoneless change detection.** No zone.js. Every view update comes from signals.
- **OnPush by default.** In v22, new components are OnPush and the old Default strategy is named Eager. Eager is not used.
- **`inject()` for dependency injection**, and the **`@Service()` decorator** for services.
- **`injectAsync()`** for lazy-loading rarely used services.
- **Functional guards, interceptors and resolvers.**

### Reactivity and state
- **Signals:** `signal`, `computed`, `linkedSignal`.
- **Signal-based component API:** `input`, `input.required`, `output`, `model`, `viewChild`, `viewChildren`, `contentChild`.
- **`resource`, `rxResource` and `httpResource`** for async reads, with reactive `params`, `status`, `error`, `value` and `reload`.
- **`afterNextRender` and `afterRenderEffect`** for DOM-touching work such as chart creation and chat auto-scroll. `effect` is reserved for true side effects.

### Templates
- **Built-in control flow:** `@if`, `@for` (with `track`), `@switch`, `@empty`, `@let`.
- **`@defer`** with viewport triggers, placeholders and loading blocks.
- **`animate.enter` and `animate.leave`** for list row transitions.
- **Host metadata** in place of `@HostBinding` and `@HostListener`.

### Forms
- **Signal Forms** (`@angular/forms/signals`, stable in v22): `form()` with schemas, built-in and custom validators, cross-field rules, conditional states, and submit helpers.
- **Custom form controls** built on `FormValueControl` and `FormCheckboxControl`: pill dropdown, month-chip multi-select, currency input.

### Routing
- **Lazy routes** with `loadComponent` and `loadChildren`, one chunk per feature.
- **Shell layout route** as parent, five feature routes as children.
- **Component input binding** so route data arrives as signal inputs.
- **Route titles and `data`** feeding the browser tab and top bar heading.

### HTTP and data
- **`HttpClient`** with the fetch backend and functional interceptors (base URL, auth stub, error normalization, retry for reads).
- **Repository pattern with abstract classes as DI tokens**: mock implementation now, transitioning to NestJS REST API implementation.

### Platform and i18n
- **Locale setup** for the Philippines with PHP as the default currency.
- Currency and date pipes, plus a custom ordinal-day pipe using `Intl.PluralRules`.
- **CDK layout breakpoints** for the responsive sidebar drawer.

## 5. Architecture and conventions

### Monorepo structure (`Nx 24`)
```
savvist-junielo/
├── apps/
│   ├── savvist-frontend/    # Angular 22 standalone SPA
│   └── savvist-backend/     # NestJS REST API
├── libs/                    # Shared libraries (if any)
└── docs/                    # Architecture, database, and project documentation
```

### Feature-based folder layout (`savvist-frontend/src/app/`)
```
src/app/
  core/        singletons: layout (shell, sidebar, top-bar), data (repository
               contracts and mocks), state (profile, record log), errors, config
  shared/      reusable, domain-free UI: dialog shell, confirm dialog, pill
               dropdown, month chips, empty/loading/error states, pipes
  features/    dashboard, chat, expenses, wishlist, record-logs,
               add-amounts, base-salary
```

### Rules
- A feature may import from `core` and `shared`, but not from another feature.
- `shared` never imports from `features`.
- Feature-only stores stay in the feature. Only data used by several areas goes in `core`.
- Modern CLI naming: files without the `.component` suffix, classes without `Component`.

## 6. Current status

- **Done:** Nx monorepo setup, Angular 22 frontend feature implementation (`dashboard`, `chat`, `expenses`, `wishlist`, `record-logs`, shell layout, shared primitives, Vitest testing setup), and NestJS backend scaffolding (`savvist-backend`).
- **In progress / Next steps:** Implementing backend REST API endpoints, Mongoose models, database seed scripts, and connecting Angular HTTP services to the NestJS backend.
