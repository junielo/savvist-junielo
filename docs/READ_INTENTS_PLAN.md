# Implementation Plan: Chat Assistant 'Read' Intent Group (Excluding Read Reminders)

This document outlines the architecture, service-layer integration, LangGraph workflow updates, and testing strategy for implementing the **`read` intent group** (specifically: `read_balances`, `read_expenses`, `read_wishlist`, `read_record_logs`, and `read_profile`, while explicitly excluding `read_reminders`) in the Savvist chat assistant (`apps/savvist-backend/src/app/modules/chat`).

---

## 1. Objectives & Scope

- **Included Read Intents:**
  1. `read_balances`: Account balances, total fund, actual cash, health, growth, allowance, trend (`DashboardService`, `DailyMetricsService`, `AccountEntriesService`).
  2. `read_expenses`: Expenses, monthly total, recurring expenses, or specific expense lookup (`ExpensesService`).
  3. `read_wishlist`: Wishlist items, pending total, next items by priority, or specific wishlist item lookup (`WishlistService`).
  4. `read_record_logs`: Audit logs of financial events with keyword/date filtering (`RecordLogsService`).
  5. `read_profile`: Profile settings, base salary, employment status (`UsersService`).
- **Explicitly Excluded:**
  - `read_reminders`: Deferred to a subsequent phase per instructions.
- **Architectural Tenet (No Raw Data Dumping):**
  - **All read database operations, filtering, and search logic must reside within their respective domain services**. Gemini (LLM) **never** scans raw collections or performs fuzzy searching over large result sets. Slot extraction extracts search entities/keywords (e.g., expense name, wishlist item name, log search query), and **code** performs exact/fuzzy matching or targeted queries before passing a compact, precise result object to the response writer.

---

## 2. Service-Layer Integration, Querying & Filtering

Each read intent maps to targeted methods across our NestJS backend modules with built-in code-side filtering:

| Intent | Domain Service | Targeted Methods & Code-Side Filtering |
|---|---|---|
| `read_balances` | `DashboardService` / `DailyMetricsService` / `AccountEntriesService` | `getSummary(userId)`, `getTrend(userId, limit)`, and account-specific lookup if an account name is provided in slots. |
| `read_expenses` | `ExpensesService` | `findAll(userId)` filtered in code or via query params to find specific expenses by name/keyword (e.g., "Do I have Netflix?") or calculate monthly totals. |
| `read_wishlist` | `WishlistService` | `findAll(userId)` filtered in code to check if a specific item exists (e.g., "Is my new phone on the wishlist?") or retrieve top priority items. |
| `read_record_logs` | `RecordLogsService` | `findAll(userId, query)` using backend/code filtering by keyword, action type, or date range. |
| `read_profile` | `UsersService` | `findCurrent()` to fetch base salary, display name, salary days, and employment status. |

### Read Tool (`read.tool.ts`) Specifications
The `ReadTool` service will inject the respective domain services and provide methods accepting search/filter parameters extracted by slots:
- `getBalances(userId: Types.ObjectId, accountName?: string)`
- `getExpenses(userId: Types.ObjectId, searchName?: string, options?: { month?: number })`
- `getWishlist(userId: Types.ObjectId, searchName?: string)`
- `getRecordLogs(userId: Types.ObjectId, query?: { search?: string; limit?: number })`
- `getProfile(userId: Types.ObjectId)`

---

## 3. LangGraph Workflow & Node Implementation

### 3.1 Intent Classification (`classify-intent.node.ts` & Jev Questions)
- Ensure Jev questions in `jev.questions.ts` have sharp, unambiguous criteria for each of the 5 read intents.

### 3.2 Slot Extraction (`extract-slots.node.ts`)
- Extract search terms, entity names, or filter parameters (e.g., `searchName`, `month`, `limit`) using Gemini structured output (`SlotSchema`), resolving relative dates in code (`resolve-relative-date.ts`).

### 3.3 Capability Check (`capability-check.node.ts`)
- Pass through `read-only-data.rule.ts` and `future-data.rule.ts` to validate read operations.

### 3.4 Read Data Node (`read-data.node.ts`)
- Inspect `intentResult.intent` and extracted slots.
- Invoke the corresponding `ReadTool` method with query/filter parameters.
- Code evaluates whether a specific item exists (e.g., matching expense or wishlist item) and structures the result payload (`{ found: true/false, item: ..., summary: ... }`).
- Store the precise result payload in `state.readResult`.

### 3.5 Response Generation (`respond.node.ts`)
- Format the structured result object into natural conversational prose using Gemini (`ReplyWriter`).
- **Strict Compliance:** Gemini never calculates or hallucinates numbers; all figures and entity names come directly from the code-filtered result object.

---

## 4. Testing & Verification Strategy

1. **Service Unit Tests:**
   - Verify domain service methods correctly filter and query records for the given `userId` and search terms.
2. **Tool & Node Unit Tests:**
   - Test `ReadTool` and `ReadDataNode` with specific queries (e.g. searching for an expense by name) to ensure code-side matching works deterministically.
3. **Graph Integration & E2E Tests:**
   - Test conversation flows for querying balances, specific expenses, wishlist items, record logs, and profile settings.

---

*Status: Plan updated with code-side filtering. Awaiting user directive to proceed with implementation.*
