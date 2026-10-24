# Savvist — Project Description

A small personal finance tracker for managing funds, daily allowance, recurring expenses and a wishlist, with an AI assistant chat and an audit log of every record. The frontend is built first with a mock data layer. A Node/Express and MongoDB backend follows.

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

### Frontend (current focus)
| Area | Choice |
|---|---|
| Framework | **Angular 22**, standalone components only |
| Language | TypeScript 6 (strict mode) |
| Runtime and tooling | Node 22+, Angular CLI 22, npm |
| UI components | **Angular Material** (Material 3 theming) and **Angular CDK** |
| Headless accessibility primitives | **Angular Aria** (`@angular/aria`) |
| Styling | **Pure SCSS** (`@use` / `@forward`, design tokens as CSS custom properties). No utility CSS frameworks. |
| Charts | **ApexCharts** via `ng-apexcharts` (own thin wrapper if the package does not support Angular 22) |
| Fonts and icons | Roboto (placeholder, Inter planned) and Material Symbols Outlined |
| Testing | **Vitest** (Angular's default runner), Material component harnesses |
| Code quality | ESLint with `angular-eslint`, Prettier |
| Dev server | Angular dev server with a proxy forwarding `/api` to the Express port |

### Backend (planned, not started)
- Node.js with Express
- MongoDB
- REST API, all routes under `/api`
- Server-sent events or a streaming response for assistant chat replies

## 4. Angular features in use

### Core architecture
- **Standalone components, directives and pipes.** No NgModules.
- **Zoneless change detection.** No zone.js. Every view update comes from signals.
- **OnPush by default.** In v22, new components are OnPush and the old Default strategy is named Eager. Eager is not used.
- **`inject()` for dependency injection**, and the **`@Service()` decorator** for services.
- **`injectAsync()`** for lazy-loading rarely used services (developer preview; confirm status on angular.dev).
- **Functional guards, interceptors and resolvers.**

### Reactivity and state
- **Signals:** `signal`, `computed`, `linkedSignal`.
- **Signal-based component API:** `input`, `input.required`, `output`, `model`, `viewChild`, `viewChildren`, `contentChild`.
- **`resource`, `rxResource` and `httpResource`** for async reads, with reactive `params`, `status`, `error`, `value` and `reload`. A streaming resource is planned for chat replies.
- **`afterNextRender` and `afterRenderEffect`** for DOM-touching work such as chart creation and chat auto-scroll. `effect` is reserved for true side effects.

### Templates
- **Built-in control flow:** `@if`, `@for` (with `track`), `@switch`, `@empty`, `@let`.
- **`@defer`** with viewport triggers, placeholders and loading blocks, used to keep ApexCharts out of the initial bundle.
- **Error boundary blocks** (`@boundary` / `@error`) around dashboard widgets (experimental; confirm in your 22.x build).
- **`animate.enter` and `animate.leave`** for list row transitions.
- **Host metadata** in place of `@HostBinding` and `@HostListener`.
- v22 template additions (comments in element attributes, spread, arrow functions), used where they remove boilerplate (some are experimental).

### Forms
- **Signal Forms** (`@angular/forms/signals`, stable in v22): `form()` with schemas, built-in and custom validators, cross-field rules, conditional `disabled`, `hidden` and `readonly` rules, per-item rules on arrays, and the submit helper.
- **Custom form controls** built on `FormValueControl` and `FormCheckboxControl` instead of ControlValueAccessor: pill dropdown, month-chip multi-select, currency input.

### Routing
- **Lazy routes** with `loadComponent` and `loadChildren`, one chunk per feature.
- **Shell layout route** as parent, five feature routes as children.
- **Component input binding** so route data arrives as signal inputs.
- **View transitions** for page changes.
- **Route titles and `data`** feeding the browser tab and top bar heading.
- **Route-level providers** and v22 route cleanup features (confirm exact API).
- **Parent parameter inheritance**: v22 changes the default, so verify nothing relies on the old behavior.

### HTTP and data
- **`HttpClient`** with the fetch backend and functional interceptors (base URL, auth stub, error normalization, retry for reads).
- **Repository pattern with abstract classes as DI tokens**: an in-memory mock implementation now, an HTTP implementation later, swapped through a provider change.

### Platform and i18n
- **Locale setup** for the Philippines with PHP as the default currency.
- Currency and date pipes, plus a custom ordinal-day pipe using `Intl.PluralRules`.
- **CDK layout breakpoints** for the responsive sidebar drawer.

### Quality
- **Vitest** with TestBed in zoneless mode, awaiting fixture stability.
- **Material component harnesses** for dialogs, buttons, tables and selects.
- **Bundle budgets** in the build config, with the build failing when exceeded.

## 5. Architecture and conventions

### Folder layout (feature-based)
```
src/app/
  core/        singletons: layout (shell, sidebar, top-bar), data (repository
               contracts and mocks), state (profile, record log), errors, config
  shared/      reusable, domain-free UI: dialog shell, confirm dialog, pill
               dropdown, month chips, empty/loading/error states, pipes
  features/    dashboard, chat, expenses, wishlist, record-logs,
               add-amounts, base-salary (each with routes, pages, components,
               data, models, dialogs as needed)
```

### Rules
- A feature may import from `core` and `shared`, but not from another feature.
- `shared` never imports from `features`.
- Feature-only stores stay in the feature. Only data used by several areas goes in `core`.
- Features push events to the record log service. The Record Logs page only reads.
- Dialogs open directly with `MatDialog` inside their own feature. Only the two top-bar dialogs (Add Amounts, Base Salary) need an opener service or a deliberate direct import.
- Modern CLI naming: files without the `.component` suffix, classes without `Component` (for example `Sidebar` in `sidebar.ts`).
- Colors come only from role-named tokens (sidebar background, primary action, and so on). The wireframe colors are placeholders and live in a single palette file.

### Domain model (conceptual)
| Entity | Fields |
|---|---|
| UserProfile | display name, base salary, unemployed flag |
| AccountEntry | id, name, type (Cash, Credit, Savings), archived flag |
| EntryRecord | id, account entry id, day, balance (one per account per day; for credit accounts the balance is the amount owed) |
| Expense | id, name, amount, day of month, months (empty means every month) |
| WishlistItem | id, name, amount, priority, status (pending, purchased) |
| RecordLog | id, name, amount, record type, date |
| Conversation / Message | id, title, timestamps / role, text, timestamp |

## 6. Current status

- **Done:** Workspace setup (Angular 22, SCSS, zoneless, Vitest, Material & CDK, ApexCharts, Angular Aria, ESLint, Prettier), feature-based folder structure, core layout (shell, sidebar, top-bar), routing and lazy feature modules, shared components/pipes/dialogs, and full implementation of all feature pages and components (`dashboard`, `chat`, `expenses`, `wishlist`, `record-logs`), along with unit tests.
- **In progress / Next steps:** Backend API integration (Node.js/Express + MongoDB backend implementation and connecting HTTP services).

Detailed per-task instructions are in `Task.md`.

## 7. Open questions

1. How are Total Fund, Actual Cash, Today's Allowance, Health and Growth calculated?
2. Does the Expenses footer total cover the current month only?
3. What goes in the dashboard divider list panel?
4. What is the priority sort order for the wishlist? (Assumed: ASAP, Priority, Important, Normal, Peripheral.)
5. Does the wishlist total count pending items only?
6. Is authentication in scope? (Assumed: not for now; a hardcoded profile sits behind the data layer.)
