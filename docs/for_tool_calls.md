# Read-Only Tool-Callable Functions & Utilities

This document lists all read-only functions and utilities in `apps/savvist-backend/src/app/modules/chat/agent` that can be used for tool calls or support data retrieval, excluding all write operations.

---

### 1. ReadTool (`apps/savvist-backend/src/app/modules/chat/agent/tools/read.tool.ts`)
*   **`getBalances(userId, accountName?, date?)`**
    *   *Description:* Retrieves account balances, summary statistics, 30-day financial trends, and daily record statuses for a user.
*   **`getExpenses(userId, searchName?, options?)`**
    *   *Description:* Fetches and filters recurring expenses for a user, supporting optional name search (with semantic matching) and month filtering, along with due date calculations.
*   **`listExpensesByDueDate(query)`**
    *   *Description:* Filters and sorts expenses by due date based on query parameters (date range, order, limit).
*   **`getExpenseById(userId, id)`**
    *   *Description:* Retrieves a specific expense by ID along with its next due date and days until due.
*   **`queryWishlist(userId, args)`**
    *   *Description:* Queries, filters, sorts, and aggregates user wishlist items.
*   **`getRecordLogs(userId, query?)`**
    *   *Description:* Searches and retrieves audit/event record logs for financial activities.
*   **`getProfile(userId)`**
    *   *Description:* Retrieves user profile details including display name, base salary, salary days, and employment status.

---

### 2. ProductSearchService (`apps/savvist-backend/src/app/modules/chat/agent/tools/product-search.service.ts`)
*   **`findProducts(query, opts)`**
    *   *Description:* Performs a grounded web search (using Gemini and Google Search) and metadata/JSON-LD extraction to find product recommendations with pricing, brands, and descriptions.

---

### 3. Supporting Data & Date Utility Functions
*   **`filterAndSortExpensesByDueDate(rows, options)`** (`data-tools.ts`)
    *   *Description:* Filters and sorts an array of expense rows by due date, capping results and computing days until due.
*   **`todayIn(timeZone, now)`** (`date-utils.ts`)
    *   *Description:* Returns today's date formatted as `YYYY-MM-DD` in a specified timezone.
*   **`toIso(y, m, d)`** (`date-utils.ts`)
    *   *Description:* Validates and formats year, month, and day into an ISO `YYYY-MM-DD` string.
*   **`daysBetween(from, to)`** (`date-utils.ts`)
    *   *Description:* Calculates the number of whole days between two date strings.
*   **`addDays(date, n)`** (`date-utils.ts`)
    *   *Description:* Adds $n$ days to a given date string.
*   **`daysInMonth(year, month)`** (`date-utils.ts`)
    *   *Description:* Returns the total number of calendar days in a given year and month.
*   **`computeNextDueDate(dayOfMonth, months, today)`** (`date-utils.ts`)
    *   *Description:* Computes the next calendar date for a recurring expense on or after `today`.
*   **`computeExpenseDueDateInfo(expense, today)`** (`date-utils.ts`)
    *   *Description:* Returns both `nextDueDate` and `daysUntilDue` for an expense.
*   **`normalizeDate(input, today)`** (`date-utils.ts`)
    *   *Description:* Parses natural language date expressions into standardized `YYYY-MM-DD` dates.
*   **`formatOrdinal(n)`** (`date-utils.ts`)
    *   *Description:* Formats a number with its ordinal suffix (e.g., 21st).
*   **`parseNumber(raw)`** (`product-search.service.ts`)
    *   *Description:* Parses currency/numeric strings or numbers into clean numeric values.
*   **`findJsonLdProducts(node, out)`** (`product-search.service.ts`)
    *   *Description:* Recursively traverses JSON-LD AST nodes to extract schema.org product entities.
*   **`factsFromOgs(r, pageUrl)`** (`product-search.service.ts`)
    *   *Description:* Extracts product facts (name, brand, prices) from Open Graph scraper and JSON-LD results.
