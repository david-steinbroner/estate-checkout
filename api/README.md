# Estate Checkout sync API

Cloudflare Worker + D1 (SQLite at the edge). See `/PROJECT_SYNC.md` at the repo root for the full design.

## One-time setup

You only run these once. After the initial deploy, all future backend changes ship via `npm run deploy`.

### 1. Install Wrangler

From this `api/` directory:

```bash
cd api
npm install
```

This installs Wrangler (Cloudflare's CLI for Workers and D1) locally so `npm run` scripts can find it.

### 2. Log in to Cloudflare

```bash
npx wrangler login
```

Opens a browser window — approve access to your Cloudflare account. This is the same account your Pages deployments use.

### 3. Create the D1 database

```bash
npm run db:create
```

Wrangler will print output that includes a `database_id`, like:

```
[[d1_databases]]
binding = "DB"
database_name = "estate-checkout"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy that `database_id` UUID and paste it into `wrangler.toml`** (replace `REPLACE_WITH_D1_UUID`).

### 4. Apply the schema migration

```bash
npm run db:migrate:remote
```

Wrangler reads `migrations/0001_init.sql` and applies it to your new D1 database.

### 5. Deploy the Worker

```bash
npm run deploy
```

Wrangler prints the deployed URL, something like:

```
https://estate-checkout-api.<your-subdomain>.workers.dev
```

**Copy that URL** — you'll paste it into `js/sync.js` in the next step (v157 commit).

### 6. Verify

```bash
curl https://estate-checkout-api.<your-subdomain>.workers.dev/health
```

Should return `{"status":"ok","service":"estate-checkout-api","time":"..."}`.

## Everyday workflow

- **Change Worker code** → `npm run deploy`
- **Change schema** → add a new file `migrations/000N_whatever.sql`, then `npm run db:migrate:remote`
- **Run locally** → `npm run dev` (uses a local SQLite file, not remote D1)
- **Tail live logs** → `npm run tail`
- **Query live DB** → `npm run db:console:remote -- "SELECT * FROM sales"`

## API reference

All endpoints return JSON. Mutations require `X-Share-Code: <code>` header unless noted.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/sales` | public | Create sale. Returns `{id, shareCode, ...}` |
| GET | `/sales/by-code/:shareCode` | public | Lookup sale by share code (join flow) |
| PATCH | `/sales/:saleId` | share_code | Update sale config |
| POST | `/sales/:saleId/invoices` | share_code | Create invoice |
| GET | `/sales/:saleId/invoices?since=<ISO>` | share_code | List invoices (delta poll) |
| GET | `/invoices/:invoiceId` | **public** | Fetch single invoice (for ticket.html) |
| PATCH | `/sales/:saleId/invoices/:invoiceId` | share_code | Update invoice |
| GET | `/health` | public | Liveness check |

## Data model

Two tables: `sales` and `invoices`. See `migrations/0001_init.sql` for the schema.

Key design notes:
- `share_code` is a 6-char human-readable string (no ambiguous chars: no 0/O/1/I/L)
- `customer_number` is server-assigned on invoice create (atomic MAX+1)
- `ticket_discount_json`, `items_json`, `discounts_json`, `consignors_json` are TEXT fields holding JSON blobs — SQLite doesn't need a native JSON column for our access patterns
- `updated_at` indexed for efficient delta polling
- Single-invoice GET is public (UUIDs are unguessable); everything sale-scoped requires the share_code

## Free tier limits

D1: 5 GB storage + 5M reads/day + 100k writes/day. At ~20 reads/min/device polling × 5 devices × 60 min = 6,000 reads per sale session. Safe by 1000×.

Workers: 100k requests/day on free tier.
