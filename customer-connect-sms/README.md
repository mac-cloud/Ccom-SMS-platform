# ISP SMS Console

A frontend-only internal tool for Internet Service Providers (ISPs) to manage customers and send SMS campaigns through a Go backend that integrates with the [TalkSasa](https://talksasa.com) SMS provider.

This project contains the browser UI and the API client layer. All business logic, authentication, database persistence, and the TalkSasa integration live in your separate Go service.

---

## What it does

The console gives you a single place to:

1. **Import your existing customer list** from CSV/Excel files.
2. **Manage customers** (CRM): add, edit, filter, and delete subscriber records.
3. **Send SMS**: one-off messages or bulk campaigns to selected customers.
4. **Track messages**: review delivery history, status, and cost.
5. **Monitor usage**: dashboard with totals, delivery rate, and TalkSasa balance.

---

## Pages and how they work together

| Page | Route | Purpose | Depends on |
|------|-------|---------|------------|
| **Dashboard** | `/` | Shows KPIs (customers, sent today/this month, delivery rate, balance) and recent messages. | `/stats`, `/messages` |
| **Customers** | `/customers` | Customer CRM table with search, status filter, create/edit/delete dialogs. | `/customers` |
| **Import CSV** | `/customers/import` | Upload a CSV, map columns, preview, and bulk import customers. | `/customers/import` |
| **Send SMS** | `/send` | Compose single or bulk SMS messages. | `/customers`, `/sms/send`, `/sms/send/bulk` |
| **Messages** | `/messages` | Filterable history of all sent SMS messages. | `/customers`, `/messages` |

The left sidebar links all of these pages together. The bottom status bar on mobile shows the same navigation in a compact horizontal strip.

---

## Features in detail

### 1. Customer management (CRM)

- **List customers** in a searchable table.
- **Search** by name or phone.
- **Filter** by status: active, suspended, cancelled, or all.
- **Add** a new customer with name, phone, plan, status, and notes.
- **Edit** any customer inline via a dialog.
- **Delete** a customer with a confirmation dialog.
- Status is displayed as a badge so you can quickly see active vs. inactive subscribers.

This page is the foundation of the app: every other feature pulls its contacts from here.

### 2. CSV import wizard

- **Upload** a `.csv` file from the browser.
- **Auto-detect columns**: the tool guesses which CSV column maps to `name`, `phone`, `plan`, `status`, and `notes` based on common header names.
- **Manual mapping**: if the guesses are wrong, select the correct column from dropdowns.
- **Preview** the first 5 rows before importing.
- **Import** sends the mapped rows to the backend, which inserts them into the database.
- **Result summary**: shows how many rows were inserted and how many failed, with row-level error messages.

### 3. Send SMS

Two modes on the same page:

#### Single SMS
- Choose a customer from the CRM dropdown, or type a phone number manually.
- Compose a message with a live character and segment counter.
- The backend sends the message through TalkSasa.

#### Bulk SMS
- Filter customers by status (active, suspended, cancelled, all).
- Select individual recipients or click **Select all**.
- Give the campaign an optional name (useful for reports).
- Compose one message and send it to all selected recipients.
- The backend returns a batch result with total, succeeded, and failed counts.

The character counter uses GSM-7 vs. UCS-2 detection to estimate how many SMS segments a message will consume.

### 4. Message history

- View every SMS sent through the backend.
- **Filter** by date range, status (sent, delivered, queued, failed), and customer.
- See date, phone, message preview, status badge, and cost per message.
- Failed messages show the error text for easy troubleshooting.

### 5. Dashboard

- One-screen overview of the business.
- Cards for: total customers, messages sent today, messages sent this month, delivery rate, and TalkSasa balance.
- A recent-messages list shows the last 10 SMS messages without leaving the page.

---

## Architecture

- **Frontend**: TanStack Start (React 19 + Vite 7) with file-based routing.
- **Styling**: Tailwind CSS v4 + shadcn/ui components.
- **Data fetching**: TanStack Query.
- **State management**: React state + TanStack Query cache; server state is refetched automatically after creates/updates/deletes.
- **Notifications**: Sonner toast for success, error, and progress feedback.
- **Backend**: Your Go service, reached through a single typed API client (`src/lib/api.ts`).
- **CSV parsing**: `papaparse` in the browser.
- **Validation**: Zod (wired through react-hook-form where forms are used).

There is **no authentication in this iteration** and **no Lovable Cloud backend**. All API calls are made to the URL you set in `VITE_API_BASE_URL`.

---

## API integration

Every HTTP request to the Python backend goes through `src/lib/api.ts`. This is the only module allowed to call `fetch`. Keeping the API surface in one file makes it easy to:

- add authentication headers later,
- change base URLs,
- add retries or request logging,
- update the contract when your Go spec changes.

See the top of `src/lib/api.ts` for the current expected endpoint map. The frontend sends/expects these JSON shapes:

- `Customer` (`id`, `name`, `phone`, `plan`, `status`, `notes?`, `created_at`)
- `Message` (`id`, `customer_id?`, `phone`, `body`, `status`, `error?`, `cost?`, `created_at`)
- `SendResult` (`batch_id`, `total`, `succeeded`, `failed`)
- `Balance` (`credits`, `currency?`)
- `DashboardStats` (`customers`, `sent_today`, `sent_month`, `delivery_rate`, `balance`)
- `ImportResult` (`inserted`, `failed`, `errors`)

### Default endpoints the UI expects

| Method | Endpoint | Used by |
|--------|----------|---------|
| `GET` | `/customers?search=&plan=&status=` | Customers page, Send SMS dropdown |
| `POST` | `/customers` | Add customer dialog |
| `GET` | `/customers/:id` | Customer detail (not currently used by UI) |
| `PUT` | `/customers/:id` | Edit customer dialog |
| `DELETE` | `/customers/:id` | Delete customer |
| `POST` | `/customers/import` | CSV import wizard |
| `POST` | `/sms/send` | Single SMS |
| `POST` | `/sms/send/bulk` | Bulk SMS |
| `GET` | `/messages?from=&to=&status=&customer_id=&limit=` | Messages page, Dashboard recent messages |
| `GET` | `/sms/balance` | (part of Dashboard stats) |
| `GET` | `/stats` | Dashboard cards |

If your Go REST spec uses different paths or field names, update `src/lib/api.ts` and the UI will automatically follow.

---

## Getting started

### Prerequisites

- Node.js 18+ (or [Bun](https://bun.sh))
- A running Go backend that exposes the endpoints above and allows CORS from the frontend origin.

### Install

```bash
# With Bun (recommended)
bun install

# With npm
npm install
```

### Environment

Copy `.env.example` to `.env` and set your Go backend URL:

```env
VITE_API_BASE_URL=http://localhost:8080
```

> The frontend dev server also runs on port `8080` by default. If your Go service uses the same port, change one of them so they do not conflict.

### Run locally

```bash
# With Bun
bun dev

# With npm
npm run dev
```

The app will open at `http://localhost:8080` (or whatever port Vite prints).

### Other scripts

```bash
bun run build       # Production build
bun run build:dev   # Development build
bun run preview     # Preview the production build
bun run lint        # ESLint
bun run format      # Prettier
```

---

## CORS

Your Python server must allow cross-origin requests from the frontend. During development, allow the Vite origin (e.g. `http://localhost:8080`). For production, allow the published domain. A permissive development setting like `*` works but should be tightened before going live.

---

## Folder map

```
.env.example
src/
  lib/
    api.ts              # The only backend entry point
    sms-utils.ts        # Phone normalization + SMS segment counter
  routes/
    __root.tsx          # Shell layout + sidebar + toast provider
    index.tsx           # Dashboard
    customers.tsx       # Customer CRM
    customers.import.tsx # CSV import wizard
    send.tsx            # Single + bulk SMS composer
    messages.tsx        # Message history / logs
  styles.css            # Tailwind v4 theme + imports
```

---

## Next steps

1. Point `VITE_API_BASE_URL` at your Go backend.
2. Implement the endpoints listed above in Go (or send the final spec so `api.ts` can be adjusted).
3. Import your existing customers via the CSV wizard.
4. Send a test single SMS, then a bulk campaign.
5. Review results on the Dashboard and Messages pages.

When you are ready for authentication or multi-user access, the frontend can be extended to add a login flow, protected routes, and auth headers inside `src/lib/api.ts` without rewriting the rest of the app.
