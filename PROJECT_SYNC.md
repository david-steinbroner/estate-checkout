# Project: Real-time Sale Sync (B-real)

**Status:** Spec, awaiting review
**Owner:** David
**Target:** Replace QR-as-sync with backend sync so multiple workers on a shared sale see each other's invoices live, and simplify the customer ticket flow.

---

## 1. Why

Today the QR code is load-bearing. When Worker A creates an invoice, the QR encodes the entire transaction payload (~3KB base64 JSON). Worker B scans, decodes, writes to local storage. That pass-by-QR is the only mechanism keeping two joined devices in sync — there is no backend. The "Shared Sale" feature only clones the sale config (name, dates, discounts), not transactions.

This has three real costs:

1. **Side-by-side workers do a scan dance** to reconcile invoices, when they should just tap a row in a shared list.
2. **The QR has to be huge** to fit the full payload, making it brittle on mediocre camera/lighting.
3. **The customer's ticket is frozen at issue time** — if Worker A applies a discount after the QR is shown, the customer's ticket doesn't update.

B-real replaces this with a real backend. QR becomes a tiny pointer. The Open Invoices list becomes the new register.

---

## 2. Architecture

### Before
```
Device A (localStorage) ←──── QR scan ────→ Device B (localStorage)
                                                      │
                                            QR scan (ticket.html)
                                                      │
                                                   Customer
```

### After
```
Device A ─┐                                           ┌─ Device B
          ├──── REST + polling ──→ Cloudflare Worker ─┤
Customer ─┘                              │            └─ Device N
(ticket.html)                      Cloudflare D1
                                   (sales + invoices)
```

**Stack (all Cloudflare, already on Pages):**
- **Cloudflare Worker** — REST API for sales/invoices CRUD
- **Cloudflare D1** — SQLite database, free tier covers our volume by 1000×
- **Polling** from client every 3s when dashboard is visible (no WebSocket needed for v1; can add Durable Objects push later)

### Why not WebSocket/Durable Objects for v1?
Polling every 3s is ~20 reads/minute per active device. D1 free tier is 5M reads/day. At 5 devices × 60min × 20 reads = 6,000 reads/sale-session. We can run ~800 sale-sessions/day on the free tier. Real-time push is nice-to-have, not need-to-have.

---

## 3. Data model (D1)

```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,              -- UUID, the internal sale id
  share_code TEXT UNIQUE NOT NULL,  -- 6-char human-readable code (ABC123)
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  discounts_json TEXT,              -- full discount schedule
  consignors_json TEXT,
  max_discount_percent INTEGER,
  status TEXT NOT NULL DEFAULT 'active',  -- active | paused | ended
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,              -- UUID
  sale_id TEXT NOT NULL,
  customer_number INTEGER NOT NULL, -- the human-facing Order #
  order_name TEXT,                  -- optional custom name
  items_json TEXT NOT NULL,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  ticket_discount_json TEXT,
  sale_day INTEGER,
  status TEXT NOT NULL DEFAULT 'open',  -- open | paid | void
  paid_at TEXT,
  voided_at TEXT,
  void_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by_device TEXT,           -- device uuid for trace/debug
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE INDEX idx_invoices_sale_status   ON invoices(sale_id, status);
CREATE INDEX idx_invoices_sale_updated  ON invoices(sale_id, updated_at DESC);
```

The `updated_at` index powers efficient delta polling (`WHERE sale_id = ? AND updated_at > ?`).

---

## 4. API surface

Base URL: `https://estate-checkout-api.<account>.workers.dev`

Auth model: **share_code as shared secret.** Any client that knows the share_code for a sale can read/write its invoices. Good enough for the threat model (estate sale operators, low adversarial risk). Can upgrade to per-device tokens later.

### Sales
| Verb | Path | Purpose |
|------|------|---------|
| POST | `/sales` | Create a new sale. Returns `{id, share_code}` |
| GET | `/sales/by-code/:shareCode` | Look up sale config (for join flow) |
| PATCH | `/sales/:id` | Update sale config (consignors added, etc.). Requires share_code header |

### Invoices
| Verb | Path | Purpose |
|------|------|---------|
| POST | `/sales/:saleId/invoices` | Create invoice |
| GET | `/sales/:saleId/invoices?since=<ISO>` | List invoices, delta poll |
| GET | `/invoices/:id` | Fetch single invoice (for ticket.html). Returns with `sale` embedded for display |
| PATCH | `/sales/:saleId/invoices/:id` | Update (mark paid, void, edit) |

### Auth header
All mutations require `X-Share-Code: <code>` header. GETs in the sale context too. The single-invoice GET (`/invoices/:id`) is public by `id` alone (UUIDs are unguessable, and customer tickets need to be shareable).

### Errors
- `401` — missing/invalid share_code
- `404` — sale or invoice not found
- `409` — write conflict (based on `updated_at` mismatch — optional, last-write-wins may be fine for v1)

---

## 5. Client integration

### New file: `js/sync.js`
Thin wrapper over `fetch`. Owns the API base URL, device id, retry/offline queue.

```js
const Sync = {
  apiBase: 'https://estate-checkout-api.<account>.workers.dev',
  deviceId: /* uuid stored in localStorage once */,

  async createSale(sale) { ... },
  async fetchSaleByCode(code) { ... },
  async createInvoice(saleId, invoice, shareCode) { ... },
  async listInvoicesSince(saleId, since, shareCode) { ... },
  async updateInvoice(saleId, invoiceId, patch, shareCode) { ... },
  async fetchInvoice(invoiceId) { ... }, // public, for ticket.html
};
```

### `js/storage.js` — keep as-is, becomes the offline cache
- Every sync read writes back to localStorage
- Every local mutation writes localStorage first, then fires async `Sync.*` call
- If the Sync call fails, enqueue for retry (simple array in localStorage, flushed on next successful call)

This is the important design choice: **localStorage stays as the single read path for the UI.** The sync layer just keeps it fresh. That means offline keeps working, the UI never blocks on network, and existing code doesn't need to be rewritten.

### `js/dashboard.js`
- On open: trigger a full sync (`listInvoicesSince(0)`)
- While visible: `setInterval(poll, 3000)` calling `listInvoicesSince(lastSync)`
- On hidden: pause polling (use `visibilitychange` event)

### `js/checkout.js`
- `saveTransaction` → writes locally, then `Sync.createInvoice` → on success, update remote_id field
- Edit invoice → `Sync.updateInvoice`
- Void → `Sync.updateInvoice({ status: 'void' })`

### `js/app.js` (sale lifecycle)
- `createSale` → `Sync.createSale` first to mint the id + share_code, then `Storage.setSale`
- `confirmJoinSale` → `Sync.fetchSaleByCode(code)` to pull full config, then local save with `remote_id` + `share_code`

### Device identity
On first load, generate `device_id = uuid()` and store in localStorage. Sent with every mutation for audit/debug. Never exposed to UI.

---

## 6. QR changes (pointer model)

**Before:**
```
QR → base64(full transaction JSON) → decoded client-side in ticket.html
```

**After:**
```
QR → https://estate-checkout.pages.dev/ticket.html?id=<invoice_id>
      ↓
    ticket.html calls GET /invoices/:id
      ↓
    renders live data from backend
```

### `ticket.html`
- Fetch invoice on load
- Render with live data
- Show live status (if marked paid on backend while customer is viewing, show ✓ Paid banner)
- QR inside ticket.html (for payment worker to scan) is the SAME pointer QR — just the URL

### Removed: worker Scan Invoice entry point
Workers don't need to scan each other's QRs anymore. Joined workers see open invoices directly in their dashboard. Kill the Scan entry from the menu and the `scan.html` flow.

### Kept: the "Give customer a ticket" flow
Still ends on a QR screen, but the QR is tiny (a short URL) and always scans cleanly.

### Copy changes on the Confirmation screen
- `Hand this phone to your payment worker` → `Give this ticket to your customer` (since workers don't need it anymore)
- Or split into two states based on context — will finalize in implementation

---

## 7. Order number promotion

Today: order numbers are scoped per device (`customer_counter` in localStorage). If two joined devices both ring up orders, both will hit `#1` independently. Under the new sync, numbers must be globally unique within a sale.

**Fix:** `customer_number` assignment moves server-side. Client calls `POST /invoices` with `customer_number: null`, server assigns next number atomically (per-sale `MAX(customer_number) + 1`).

Order numbers become authoritative lookup keys. Payment worker who can't scan a QR just asks "what's your order number?" and finds the row in the Open Invoices list.

---

## 8. Migration strategy

Existing users have localStorage-only sales. On first app load after this ships:

- **Active sales without remote_id:** show a one-time sheet — "Your current sale isn't backed up to the cloud. Upgrade now to enable sharing and recovery?" → yes creates remote sale, migrates invoices; no continues local-only
- **Ended sales:** stay local-only forever (historical, no need to migrate)
- **New sales:** always remote-first

No destructive migration. Existing data never disappears.

---

## 9. Rollout — phased

### Phase 1: backend + basic sync (core work)
- [ ] D1 schema + migrations
- [ ] Worker with full CRUD
- [ ] `js/sync.js` wrapper
- [ ] `Storage` write-through + offline queue
- [ ] Dashboard polling loop
- [ ] Server-assigned customer_numbers
- [ ] Create-sale + join-sale flows hit the backend
- [ ] Basic error UI (toast on sync failure, retry indicator)

**Ships as:** v150 (major version bump to signal architecture shift)

### Phase 2: QR simplification
- [ ] Shrink QR to pointer URL
- [ ] `ticket.html` fetches from backend
- [ ] Remove Scan Invoice entry from the menu
- [ ] Update Confirmation screen copy
- [ ] Mark Paid button becomes just "Mark paid" (no "without scanning" since scanning is gone)

**Ships as:** v151

### Phase 3: polish
- [ ] Visible sync state indicator in header (green dot = synced, yellow = syncing, red = offline)
- [ ] Conflict resolution UX (rare — last-write-wins probably fine)
- [ ] Dashboard empty state when joined but no invoices yet ("Waiting for the first order...")
- [ ] Durable Objects / WebSocket push as a v2 upgrade path

**Ships as:** v152+

---

## 10. Open decisions — need your call

1. **Scope of first ship.** Phase 1 alone (sync works, QR stays dual-use temporarily), or phases 1+2 together (bigger drop but cleaner)?
2. **Migration of existing shared sales.** Aggressive (migrate on load) or passive (only new sales are shared)? Aggressive is cleaner but riskier.
3. **Sync frequency.** 3s polling feels responsive and stays well under quota — stick with that or go more conservative (5-10s) to save requests?
4. **Offline writes.** Should the UI show a "pending sync" indicator on invoices that haven't been confirmed server-side yet? Or silent until failure?
5. **Sale lifecycle in D1.** Keep forever? Purge after 90 days? Relevant for privacy and D1 storage ceiling.
6. **Account/device trust.** Stick with share_code as shared secret for v1, or bite off per-device tokens now? Tokens are maybe half a day of extra work and meaningfully safer.

---

## 11. What's NOT in scope

- User accounts / login
- Sale analytics / cross-sale reporting
- Payment processor integration (still manual mark-paid)
- Receipt printing
- Inventory tracking
- Multi-sale dashboards

Those are all future projects.

---

## 12. Estimated effort

- Phase 1: **1.5–2 days** (backend half day, client-side sync layer + dashboard loop + create/join flow rework, QA on two devices)
- Phase 2: **0.5 day** (pointer QR is subtractive — mostly removing code)
- Phase 3: **0.5 day** (polish + indicators)

**Total: ~2.5–3 days** of focused work.
