# DATABASE.md — Savvist MongoDB Architecture

Database design for the Savvist personal finance tracker (Node.js + Express + MongoDB). It is derived from the wireframes and the frontend plan in `PROJECT DESCRIPTION.md` and `Task.md`. Items marked **[DECIDE]** are open questions where I made an assumption you should confirm.

**Revision note:** money sources are now modeled as two collections. `accountEntries` holds the accounts (BDO, BPI, GCash), which are created once. `entryRecords` holds the balance of each account for each day.

---

## 1. Design principles

1. **Every document belongs to a user.** The wireframe says "Welcome User A", and the app may grow to several users. Every collection except `users` carries a `userId`, every query filters by it, and every index starts with it. Adding authentication later then needs no schema change.
2. **Separate "what exists" from "what happened".** Accounts are slow-changing definitions (saved once). Daily balances are time-series facts (one per account per day). They live in different collections.
3. **Store only what cannot be derived.** Total Fund, Actual Cash, Today's Allowance, Health, Growth, current balances, the chart series and the footer totals are computed from other collections (section 7).
4. **Money is stored as integer centavos**, never floats. PHP 1,000.50 is stored as `100050`. The API converts at the boundary so the frontend currency pipe sees pesos.
5. **Calendar days are stored as `YYYY-MM-DD` strings** (the user's local day, Asia/Manila). Moments in time are BSON `Date` in UTC. A daily balance belongs to a calendar day, and a UTC midnight timestamp would land on 8:00 AM Manila time and cause off-by-one-day bugs.
6. **Embed what is always read together and stays small. Reference what grows without bound.** Chat messages and daily balances are therefore their own collections.
7. **Record logs are append-only and self-contained.** They snapshot the name and amount at the time of the event, so they stay correct if the source is later edited or deleted.
8. **Field naming:** camelCase fields, plural camelCase collection names, `_id` as `ObjectId`, enums as lowercase strings.

## 2. Collections at a glance

| Collection | Source in the UI | Purpose |
|---|---|---|
| `users` | top bar, Base Salary dialog, welcome message | Profile, base salary, unemployed flag |
| `accountEntries` | Add Amounts dialog, "+ Create New Entry" | The user's accounts (BDO, BPI, GCash). Saved once. |
| `entryRecords` | Add Amounts dialog, amount inputs | Balance of each account for each day |
| `expenses` | Expenses page and dialog | Recurring or month-specific expenses |
| `wishlistItems` | Wishlist page and dialog | Planned purchases with priority and status |
| `recordLogs` | Record Logs page | Append-only audit trail of every financial event |
| `conversations` | Chat right panel | Saved chat threads |
| `messages` | Chat thread | Individual chat messages |
| `monthlySummaries` *(optional, later)* | Dashboard line chart | Precomputed month totals |

## 3. Relationships

```mermaid
erDiagram
    users ||--o{ accountEntries : owns
    users ||--o{ entryRecords : owns
    users ||--o{ expenses : owns
    users ||--o{ wishlistItems : owns
    users ||--o{ recordLogs : owns
    users ||--o{ conversations : owns
    accountEntries ||--o{ entryRecords : "has daily balances"
    conversations ||--o{ messages : contains
    entryRecords ||--o{ recordLogs : "logged by (soft ref)"
    expenses ||--o{ recordLogs : "logged by (soft ref)"
    wishlistItems ||--o{ recordLogs : "logged by (soft ref)"
```

- Hard references (always valid): everything points to `users._id` through `userId`. `entryRecords` point to `accountEntries._id`. `messages` point to `conversations._id`.
- Soft references: `recordLogs.sourceId` points to the record that caused the log and may dangle after deletion. That is intended, because the log is a historical snapshot.

---

## 4. Collection schemas

### 4.1 `users`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `displayName` | string | yes | Shown in "Welcome User A". 1 to 60 chars. |
| `email` | string | no | Required once authentication is added. Lowercased, unique. |
| `passwordHash` | string | no | Future. Never returned by the API. |
| `baseSalary` | int (centavos) | yes | `>= 0`. Forced to `0` when `isUnemployed` is true. |
| `salaryDay1` | int | no | 1 to 31. First salary day of the month (e.g., 15). |
| `salaryDay2` | int | no | 1 to 31. Second salary day of the month, if applicable (e.g., 30). |
| `isUnemployed` | bool | yes | Default `false`. Mirrors the "Currently unemployed" checkbox. |
| `currency` | string | yes | Default `"PHP"`. |
| `locale` | string | yes | Default `"en-PH"`. |
| `timeZone` | string | yes | Default `"Asia/Manila"`. Decides what "today" means for daily balances. |
| `createdAt`, `updatedAt` | Date | yes | |

Example:

```json
{
  "_id": "665f1c2a9b1e8a0012a1b001",
  "displayName": "User A",
  "baseSalary": 3000000,
  "salaryDay1": 15,
  "salaryDay2": 30,
  "isUnemployed": false,
  "currency": "PHP",
  "locale": "en-PH",
  "timeZone": "Asia/Manila",
  "createdAt": "2026-10-23T02:00:00.000Z",
  "updatedAt": "2026-10-23T02:00:00.000Z"
}
```

Rules:
- `baseSalary` and `isUnemployed` are updated together. The server enforces "unemployed means salary 0".
- The profile is embedded in the user document because it is one record read on every page load.

### 4.2 `accountEntries` (accounts, saved once)

Created from "+ Create New Entry" in the Add Amounts dialog: an entry name such as "BDO", "BPI" or "GCash", plus an entry type.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `userId` | ObjectId | yes | |
| `name` | string | yes | 1 to 60 chars. Unique per user, case-insensitive. |
| `type` | string enum | yes | `cash`, `credit`, `savings`. The wireframe's dropdown defaults to "Cash Amount". |
| `archivedAt` | Date | no | Set instead of deleting when the account already has daily balances (section 9). |
| `sortOrder` | int | no | Optional manual ordering in the dialog. Falls back to `createdAt`. |
| `createdAt`, `updatedAt` | Date | yes | |

Example:

```json
{
  "_id": "665f1c2a9b1e8a0012a1c001",
  "userId": "665f1c2a9b1e8a0012a1b001",
  "name": "BDO Debit",
  "type": "cash",
  "createdAt": "2026-10-23T02:05:00.000Z",
  "updatedAt": "2026-10-23T02:05:00.000Z"
}
```

Rules:
- An account holds **no balance**. Balances live in `entryRecords`.
- Renaming an account updates only this document. Historical `entryRecords` keep a snapshot of the old name (see 4.3).
- For `credit` accounts, the balance stored in `entryRecords` is the **amount owed** (a positive number). It is a liability: it is subtracted when computing Total Fund and is never counted as cash.
- Changing `type` after records exist changes how past totals are interpreted. Lock the type once any `entryRecords` exist, or allow it and accept that history snapshots keep the old type **[DECIDE]**. I recommend locking.

### 4.3 `entryRecords` (daily balances per account)

One document per account per calendar day. This is what the user fills in every day in the Add Amounts dialog.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `userId` | ObjectId | yes | |
| `accountEntryId` | ObjectId | yes | Reference to `accountEntries._id`. |
| `day` | string | yes | Calendar day, `YYYY-MM-DD`, in the user's time zone. |
| `balance` | int (centavos) | yes | `>= 0`. The account balance on that day. |
| `accountName` | string | yes | Snapshot of the account name when recorded. |
| `accountType` | string enum | yes | Snapshot of the type (`cash`, `credit`, `savings`). |
| `createdAt`, `updatedAt` | Date | yes | |

Example:

```json
{
  "_id": "665f1c2a9b1e8a0012a1c101",
  "userId": "665f1c2a9b1e8a0012a1b001",
  "accountEntryId": "665f1c2a9b1e8a0012a1c001",
  "day": "2026-10-23",
  "balance": 1500000,
  "accountName": "BDO Debit",
  "accountType": "cash",
  "createdAt": "2026-10-23T02:10:00.000Z",
  "updatedAt": "2026-10-23T02:10:00.000Z"
}
```

Rules:
- **Unique on `(userId, accountEntryId, day)`.** Saving again on the same day **overwrites** that day's balance (an upsert), never creates a second record. Each overwrite is logged in `recordLogs`.
- **Missing days are not stored.** If the user skips a day, the balance carries forward from the most recent earlier record. This is derived when reading, so no filler documents are written.
- **Current balance of an account** = its record with the latest `day`.
- **Back-dating is allowed.** The user can enter or correct the balance for any past day. **Future days are rejected** (confirmed). "Future" is judged against today's date in the user's time zone.
- **Replacement detection.** If a record already exists for that account and day, saving a different balance replaces it. The user must be told first: the UI shows a warning on each affected row (old balance and new balance), and the **server enforces it too**: the bulk save returns a conflict listing the existing balances that would be replaced, and only applies the change when the request carries an explicit confirmation (section 10). Saving the same value as the existing balance is a no-op.
- **Effect on derived values.** Because missing days carry forward, changing a past balance changes every later day until that account's next record. This is correct and needs no recomputation, since the values are derived.
- The snapshot fields (`accountName`, `accountType`) mean charts and history do not need a join and stay correct after renames or archiving.
- The Add Amounts dialog works like this: the user picks a day (default today, past days allowed, future days disabled). The dialog lists the user's non-archived accounts, prefills each input with that day's record if one exists (otherwise the last known balance), highlights rows whose save would replace an existing balance, and Save upserts that day's records in one request after the user confirms any replacements.

**Optional optimization:** store `latestBalance` and `latestDay` on `accountEntries` to avoid an aggregation for the dashboard cards. It adds a write on every save and must stay consistent with back-dated edits, so skip it until the aggregation is measurably slow.

### 4.4 `expenses`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `userId` | ObjectId | yes | |
| `name` | string | yes | 1 to 80 chars. |
| `amount` | int (centavos) | yes | `> 0`. |
| `dayOfMonth` | int | yes | 1 to 31. Shown as "21st". |
| `months` | array of int | yes | Each value 1 to 12, no duplicates. **Empty array = every month.** Non-empty = only those months. |
| `createdAt`, `updatedAt` | Date | yes | |

Example, a monthly expense and a month-specific one:

```json
{ "name": "Internet", "amount": 150000, "dayOfMonth": 21, "months": [] }
{ "name": "Insurance", "amount": 600000, "dayOfMonth": 5, "months": [1, 12] }
```

Rules:
- The recurrence badge is derived from `months.length > 0`. No stored boolean, so the two can never disagree.
- Validation: `months` entries are unique integers 1 to 12. `dayOfMonth` must exist in at least one chosen month (31 with only `[2]` is rejected). For months shorter than `dayOfMonth`, the expense is due on the month's last day. This must match the frontend rule.
- Months are stored as numbers, and the frontend maps them to labels.

### 4.5 `wishlistItems`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `userId` | ObjectId | yes | |
| `name` | string | yes | 1 to 80 chars. |
| `amount` | int (centavos) | yes | `> 0`. |
| `priority` | string enum | yes | `priority`, `asap`, `important`, `normal`, `peripheral`. Default `normal`. |
| `status` | string enum | yes | `pending` or `purchased`. Default `pending`. |
| `purchasedAt` | Date | no | Set when status becomes `purchased`. Cleared on undo. |
| `createdAt`, `updatedAt` | Date | yes | |

Example:

```json
{
  "_id": "665f1c2a9b1e8a0012a1d001",
  "userId": "665f1c2a9b1e8a0012a1b001",
  "name": "Mechanical keyboard",
  "amount": 450000,
  "priority": "important",
  "status": "pending",
  "createdAt": "2026-10-23T02:10:00.000Z",
  "updatedAt": "2026-10-23T02:10:00.000Z"
}
```

Notes:
- The "Wishlist Type" dropdown and the inline pill both edit `priority`.
- Sort order is applied in the application (lists are small). If you need it in a query, add a numeric `priorityRank`. **[DECIDE]** the order. I assumed ASAP, Priority, Important, Normal, Peripheral.
- Checking an item marks it `purchased` and writes a `recordLogs` entry in the same transaction (section 8).

### 4.6 `recordLogs`

Append-only. The Record Logs page shows Name, Amount, Record Type and Date.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `userId` | ObjectId | yes | |
| `name` | string | yes | Snapshot of the source name, or a description such as "Base salary updated". |
| `amount` | int (centavos) | yes | Snapshot of the amount (balance, expense or price) for this event. |
| `recordType` | string enum | yes | `expense`, `cash`, `savings`, `credit`, `wishlist`. |
| `action` | string enum | yes | `created`, `updated`, `deleted`, `purchased`, `adjusted`. |
| `date` | Date | yes | When the event happened. Defaults to now. |
| `sourceCollection` | string | no | `accountEntries`, `entryRecords`, `expenses`, `wishlistItems`, `users`. |
| `sourceId` | ObjectId | no | Soft reference to the source document. |
| `previousAmount` | int (centavos) | no | For overwrites (`action = updated`): the balance that was replaced. Lets the log show "replaced X with Y". |
| `effectiveDay` | string | no | For daily balances: the calendar day (`YYYY-MM-DD`) the balance belongs to. Differs from `date` when a past day was back-dated. |
| `createdAt` | Date | yes | No `updatedAt`, because logs never change. |

Example, a daily balance saved:

```json
{
  "_id": "665f1c2a9b1e8a0012a1e001",
  "userId": "665f1c2a9b1e8a0012a1b001",
  "name": "BDO Debit",
  "amount": 1500000,
  "recordType": "cash",
  "action": "created",
  "date": "2026-10-23T02:10:00.000Z",
  "sourceCollection": "entryRecords",
  "sourceId": "665f1c2a9b1e8a0012a1c101",
  "createdAt": "2026-10-23T02:10:00.000Z"
}
```

Rules:
- The API exposes **no update or delete** for this collection. Writes come only from other modules' service code.
- Events that produce a log:
  - daily balance saved (`recordType` is the account's type: `cash`, `credit` or `savings`; `action` is `created` for the first record of the day and `updated` for an overwrite, which also stores `previousAmount` and `effectiveDay`);
  - expense created, updated or deleted (`expense`);
  - wishlist item purchased (`wishlist`);
  - base salary changed (use `cash` with a descriptive name, or add a `salary` type **[DECIDE]**).
- Creating an account (`accountEntries`) does not need a log. Its first daily balance does.
- Only write a log when the balance actually changed, so re-saving an unchanged dialog does not flood the table.

### 4.7 `conversations`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `userId` | ObjectId | yes | |
| `title` | string | yes | 1 to 100 chars. Editable (the pencil in the right panel). Defaults to "New chat". |
| `lastMessageAt` | Date | yes | Orders the list. Updated on every new message. |
| `createdAt`, `updatedAt` | Date | yes | |

### 4.8 `messages`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | yes | |
| `conversationId` | ObjectId | yes | |
| `userId` | ObjectId | yes | Denormalized so ownership checks need no join. |
| `role` | string enum | yes | `user` or `assistant`. |
| `content` | string | yes | Message text. Cap length (for example 8,000 chars for user messages). |
| `status` | string enum | no | `complete` (default), `streaming`, `error`. Supports partial and failed assistant replies. |
| `createdAt` | Date | yes | Orders the thread. |

Messages are separate from `conversations` because a thread grows without bound (16 MB document cap), embedding would rewrite a large document on every message, and separate documents allow paging older messages. Deleting a conversation deletes its messages in the same transaction.

### 4.9 `monthlySummaries` (optional, later)

Only add this if aggregating `entryRecords` for the dashboard line chart becomes slow. It is a cache that can be rebuilt.

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | |
| `year`, `month` | int | Unique together per user. |
| `endingFund` | int (centavos) | Sum of latest balances at month end. |
| `totalExpenses` | int (centavos) | Depends on the chart metric **[DECIDE]**. |
| `updatedAt` | Date | |

---

## 5. Indexes

| Collection | Index | Type | Purpose |
|---|---|---|---|
| `users` | `{ email: 1 }` | unique, sparse | Login lookup once auth exists |
| `accountEntries` | `{ userId: 1, name: 1 }` | unique, collation `{ locale: "en", strength: 2 }` | No duplicate account names per user, case-insensitive |
| `accountEntries` | `{ userId: 1, archivedAt: 1 }` | compound | List active accounts in the dialog |
| `entryRecords` | `{ userId: 1, accountEntryId: 1, day: 1 }` | **unique** | One balance per account per day, and upsert target |
| `entryRecords` | `{ userId: 1, day: -1 }` | compound | Load a given day, and the latest days for charts |
| `expenses` | `{ userId: 1, dayOfMonth: 1 }` | compound | List sorted by due day |
| `expenses` | `{ userId: 1, months: 1 }` | compound, multikey | "Expenses for month M" |
| `wishlistItems` | `{ userId: 1, status: 1, priority: 1 }` | compound | Pending list, total by status |
| `recordLogs` | `{ userId: 1, date: -1 }` | compound | Default newest-first table, pagination |
| `recordLogs` | `{ userId: 1, recordType: 1, date: -1 }` | compound | Record Type filter |
| `recordLogs` | `{ userId: 1, sourceId: 1 }` | compound | History of one record (optional) |
| `conversations` | `{ userId: 1, lastMessageAt: -1 }` | compound | Right-panel list order |
| `messages` | `{ conversationId: 1, createdAt: 1 }` | compound | Load a thread in order, page by cursor |
| `monthlySummaries` | `{ userId: 1, year: 1, month: 1 }` | unique | One row per month |

Notes:
- The first key is always `userId`, so every query is scoped to one user and index-supported.
- The unique `entryRecords` index also serves "latest record for one account" queries by sorting `day` descending.
- Use cursor pagination (`date` plus `_id`) on Record Logs and Messages instead of `skip`.
- Do not add indexes beyond this list ahead of need. Check with `explain()` as data grows.

## 6. Validation and constraints

Enforce rules in **three layers**:

1. **Express request validation** (for example Zod or Joi) rejects bad input with clear 400 errors in the shape the Angular error interceptor expects.
2. **Mongoose schemas** (recommended, with TypeScript types) apply defaults, enums, min/max, trimming, and `timestamps: true`.
3. **MongoDB `$jsonSchema` validators** on each collection as the last line of defense.

| Rule | Where |
|---|---|
| Money fields are integers, `>= 0` (`> 0` for expense and wishlist amounts) | all layers |
| `day` matches `YYYY-MM-DD` and is a real calendar date | all layers |
| One `entryRecords` document per account per day | unique index |
| `entryRecords.accountEntryId` belongs to the same `userId` | service layer |
| Archived accounts cannot receive new records | service layer |
| `day` cannot be in the future (in the user's time zone) | service layer |
| Replacing an existing daily balance requires explicit confirmation in the request | service layer (conflict response otherwise) |
| `dayOfMonth` 1 to 31, `months` unique values 1 to 12 | all layers |
| Account name unique per user (case-insensitive) | unique index |
| `isUnemployed = true` forces `baseSalary = 0` | service layer |
| Expense `dayOfMonth` valid for at least one selected month | service layer |
| `recordLogs` insert-only | no update or delete routes, restricted DB role in production |
| Ownership: a user only reads or writes their own documents | every query, via a shared scoped helper |

## 7. Derived values (not stored)

"Latest balance per account" means: for each non-archived account, the `entryRecords` document with the greatest `day` up to today (sort by `day` descending, group by `accountEntryId`, take the first).

| UI value | How to derive |
|---|---|
| Current balance of an account | Latest `entryRecords` for that account |
| Total Fund | Latest balances of `cash` and `savings` accounts **minus** the latest balance of `credit` accounts (amount owed) **[DECIDE exact formula]** |
| Actual Cash | Sum of the latest balances of `cash` accounts (and possibly `savings`) **[DECIDE]** |
| Today's Allowance | From actual cash, remaining expenses for the month and days left **[DECIDE]** |
| Health, Growth gauges | Formulas not yet defined **[DECIDE]**. Keep each as one pure function so it can change without a migration. |
| Expenses footer total | `$match` on `userId` and (`months` empty or `months` contains the month), then `$sum` of `amount` |
| Wishlist footer total | `$match` on `userId` and `status = pending`, then `$sum` of `amount` |
| Line chart series | One point per day (or month) of total fund, built from `entryRecords` with carry-forward of missing days. Cache in `monthlySummaries` only if needed. |
| Day-over-day change | Difference between a day's total and the previous recorded day's total |
| Expense recurrence badge | `months.length > 0` |
| "Entered today?" indicator | Whether each active account has an `entryRecords` document for today |

Because these are queries or pure functions, a formula change never requires a data migration. Back-dating a balance also needs no recomputation, because current and historical values are always derived from the records.

## 8. Transactions and consistency

MongoDB multi-document transactions require a **replica set**, including in development. Run a single-node replica set locally (for example through Docker or `mongod --replSet`), and use a managed cluster such as Atlas in production.

| Operation | Steps in one transaction |
|---|---|
| Save Add Amounts dialog | Upsert every changed `entryRecords` document for the day, then insert one `recordLogs` entry per changed balance |
| Purchase a wishlist item | Update `wishlistItems` (`status`, `purchasedAt`), insert `recordLogs` |
| Undo a purchase | Revert the item, then insert a compensating log (do not delete the old one) |
| Update base salary | Update `users`, insert `recordLogs` |
| Create, edit or delete an expense | Write `expenses`, insert `recordLogs` |
| Delete a conversation | Delete the `conversations` document and its `messages` |
| Delete an account that has no records | Delete `accountEntries` document (a single write, no transaction needed) |

The unique index on `entryRecords` also protects against a double-click or two tabs creating duplicate daily records.

## 9. Deletion policy

- **Accounts (`accountEntries`):** hard delete only if the account has no `entryRecords`. Otherwise set `archivedAt`. Archived accounts disappear from the dialog and from current totals, but their past records still feed history and charts. The delete button in the dialog calls one endpoint, and the server picks delete or archive.
- **Daily records (`entryRecords`):** editing overwrites. Deleting a single day's record is allowed (the balance then carries forward from the previous day), and it is logged.
- **Expenses, wishlist items, conversations, messages:** hard delete. History survives in `recordLogs` snapshots.
- **Record logs:** never deleted, except when the whole user account is deleted.
- **Account deletion (later):** removes all documents with that `userId`.

## 10. API mapping (for the Express phase)

All routes are under `/api` (matching the dev proxy) and scoped to the authenticated or hardcoded user.

| Resource | Endpoints |
|---|---|
| Profile | `GET /api/me`, `PATCH /api/me` (salary, unemployed flag) |
| Account entries | `GET/POST /api/account-entries`, `PATCH/DELETE /api/account-entries/:id` |
| Entry records | `GET /api/entry-records?day=YYYY-MM-DD` (accounts with that day's balance, or last known), `PUT /api/entry-records/:day` (bulk upsert from the dialog, any past day or today), `GET /api/entry-records?from=&to=` (range for charts). If the body would replace existing balances and does not include `confirmReplace: true`, the server responds **409 Conflict** with the list of affected accounts (existing balance and proposed balance) and writes nothing. The client shows the warning, then resends with `confirmReplace: true`. |
| Expenses | `GET/POST /api/expenses`, `PATCH/DELETE /api/expenses/:id`, `GET /api/expenses/total?month=` |
| Wishlist | `GET/POST /api/wishlist`, `PATCH/DELETE /api/wishlist/:id`, `POST /api/wishlist/:id/purchase`, `POST /api/wishlist/:id/undo-purchase` |
| Record logs | `GET /api/record-logs?type=&cursor=&limit=` (read-only) |
| Dashboard | `GET /api/dashboard/summary`, `GET /api/dashboard/trend` |
| Conversations | `GET/POST /api/conversations`, `PATCH/DELETE /api/conversations/:id` |
| Messages | `GET /api/conversations/:id/messages?cursor=`, `POST /api/conversations/:id/messages` (streams the assistant reply) |

Mapping rules (done in the Angular repository layer, per T19):
- API returns `id` (string) in place of `_id`, and ISO date strings.
- Centavos convert to pesos at the boundary, in one place.
- `day` stays a `YYYY-MM-DD` string end to end. The frontend must not convert it through a `Date` object, to avoid time zone shifts.
- Enum strings match the frontend's union types exactly.

## 11. Seed data

Seed the development database so the frontend and backend show the same data:
- 1 user: "User A", base salary PHP 30,000, time zone Asia/Manila.
- Accounts: "BDO Debit" (cash), "BDO Credit" (credit), "GCash" (cash), "BPI" (savings).
- Daily balances for each account over the last 30 days, with a few skipped days to exercise the carry-forward logic.
- 5 expenses, one of them month-specific (months `[1, 12]`).
- 5 wishlist items, one for each priority.
- Record logs covering each record type.
- 2 conversations with a few messages each.

## 12. Open questions

**Resolved:** balances can be entered for past days, with a warning that the new balance replaces the old one (enforced by the server). Future days cannot be entered. A credit account's balance is the amount owed.

1. Final formulas for Total Fund, Actual Cash, Today's Allowance, Health, and Growth:

   Let A = (All Cash Amount) - (All Credit Amount) - (All Expenses) = Actual Cash
   Let F = (All Cash Amount) + (All Savings Amount) - (All Credit Amount) - (All Expenses) = Total Funds
   Let B = Base Income
   Let N = B - B * 0.15 = Net Income

   Today's Allowance:
   Let Y = (N / 2) * 0.2 = The money needs to set aside per cutoff
   Allowance = (min(N / 2, A) - Y) / daysUntilNextPayday

   Health:
   Let E = Total Expenses
   Let C = Total Credit
   Let R = N - (E + C) = Remaining Income
   Health = ((F / (B * 3)) + (R / N)) / 2

   Growth:
   prevTtlFund = Get the total fund for the first day of the month of the past 90 days. Example let's say today is Oct. 26, so the date 90 days before the current date is July 28 but we will get the total fund of the first day of July.
   Growth = (currTtlFund - prevTtlFund) / prevTtlFund
2. Should the account type be locked once balances exist? **Yes.**
3. Does base salary generate monthly income automatically, or is it only a figure for calculations? **Base salary is not recorded repeatedly; there should only be one record per user.**
4. Does the line chart show total fund per day, expenses per month, or something else? **It shows daily total funds for 30 days.**
5. Is a separate `salary` record type needed in `recordLogs`? **No.**
6. Priority sort order for the wishlist. **Yes (ASAP, Priority, Important, Normal, Peripheral).**
7. Single user for now, or multiple users with authentication from the start? **Single user for now.**
8. Should chat messages persist an AI context or system prompt, and does the assistant get read access to the user's financial data? **AI chat should have a LangGraph memory checkpointer. It should have read and write access to financial data, but for write operations, it must ask permission first from the user.**
