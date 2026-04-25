-- Estate Checkout sync API — initial schema
-- Per PROJECT_SYNC.md §3

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,                  -- UUID
  share_code TEXT UNIQUE NOT NULL,      -- 6-char human-readable code (e.g. "ABC123")
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  discounts_json TEXT,                  -- discount schedule as JSON array
  consignors_json TEXT,                 -- consignors as JSON array
  max_discount_percent INTEGER,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | ended
  ended_at TEXT,                        -- ISO timestamp when sale was ended (for 90d purge)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,                  -- UUID
  sale_id TEXT NOT NULL,
  customer_number INTEGER NOT NULL,     -- human-facing Order # (server-assigned, unique per sale)
  order_name TEXT,                      -- optional custom name
  items_json TEXT NOT NULL,             -- items array as JSON
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  ticket_discount_json TEXT,            -- invoice-level discount as JSON, or NULL
  sale_day INTEGER,                     -- which day of the sale (1-indexed)
  status TEXT NOT NULL DEFAULT 'open',  -- open | unpaid | paid | void
  paid_at TEXT,
  voided_at TEXT,
  void_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by_device TEXT,               -- device UUID for audit/debug
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_sale_status   ON invoices(sale_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_updated  ON invoices(sale_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_share_code       ON sales(share_code);
CREATE INDEX IF NOT EXISTS idx_sales_ended_at         ON sales(ended_at);
