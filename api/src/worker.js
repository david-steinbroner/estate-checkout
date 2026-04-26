/**
 * Estate Checkout sync API
 * Cloudflare Worker + D1 (SQLite at the edge)
 *
 * See PROJECT_SYNC.md for the full design.
 *
 * Endpoints:
 *   POST   /sales                                  — create sale, returns {id, shareCode, ...}
 *   GET    /sales/by-code/:shareCode               — lookup sale config (for join flow)
 *   PATCH  /sales/:saleId                          — update sale config (requires X-Share-Code)
 *   POST   /sales/:saleId/invoices                 — create invoice (requires X-Share-Code)
 *   GET    /sales/:saleId/invoices?since=<ISO>     — list invoices (requires X-Share-Code)
 *   GET    /invoices/:invoiceId                    — fetch single invoice (public, for ticket.html)
 *   PATCH  /sales/:saleId/invoices/:invoiceId      — update invoice (requires X-Share-Code)
 *   GET    /health                                  — liveness check
 *
 * Auth model (v1): share_code as shared secret. Any client with the 6-char share_code
 * can read/write the sale's invoices. Single-invoice GET is public by id (UUIDs are
 * unguessable; customer tickets need to be linkable).
 */

const ALLOWED_HEADERS = 'Content-Type, X-Share-Code';

// === Helpers ===

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

// Unambiguous chars only — no 0/O/1/I/L
function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function nowIso() {
  return new Date().toISOString();
}

async function getSaleById(env, saleId) {
  return await env.DB.prepare('SELECT * FROM sales WHERE id = ?').bind(saleId).first();
}

async function getSaleByShareCode(env, shareCode) {
  return await env.DB.prepare('SELECT * FROM sales WHERE share_code = ?').bind(shareCode).first();
}

/**
 * Validate share_code header against the sale. Returns { sale } on success
 * or { error: Response } on failure.
 */
async function authSale(request, env, saleId) {
  const shareCode = request.headers.get('X-Share-Code');
  if (!shareCode) return { error: json({ error: 'Missing X-Share-Code header' }, 401) };
  const sale = await getSaleById(env, saleId);
  if (!sale) return { error: json({ error: 'Sale not found' }, 404) };
  if (sale.share_code !== shareCode) return { error: json({ error: 'Invalid share code' }, 401) };
  return { sale };
}

function rowToSale(row) {
  if (!row) return null;
  return {
    id: row.id,
    shareCode: row.share_code,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    discounts: row.discounts_json ? JSON.parse(row.discounts_json) : [],
    consignors: row.consignors_json ? JSON.parse(row.consignors_json) : [],
    maxDiscountPercent: row.max_discount_percent,
    status: row.status,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    saleId: row.sale_id,
    customerNumber: row.customer_number,
    orderName: row.order_name,
    items: JSON.parse(row.items_json),
    subtotal: row.subtotal,
    total: row.total,
    ticketDiscount: row.ticket_discount_json ? JSON.parse(row.ticket_discount_json) : null,
    saleDay: row.sale_day,
    status: row.status,
    paidAt: row.paid_at,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByDevice: row.created_by_device
  };
}

// === Handlers ===

async function createSale(request, env) {
  const body = await request.json().catch(() => ({}));
  const id = crypto.randomUUID();

  // Generate a unique share code (retry on collision — extremely rare at 32^6)
  let shareCode;
  for (let attempts = 0; attempts < 10; attempts++) {
    shareCode = generateShareCode();
    const existing = await getSaleByShareCode(env, shareCode);
    if (!existing) break;
    if (attempts === 9) return json({ error: 'Could not generate unique share code' }, 500);
  }

  const ts = nowIso();
  await env.DB.prepare(`
    INSERT INTO sales (id, share_code, name, start_date, end_date, discounts_json, consignors_json, max_discount_percent, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    shareCode,
    body.name || 'Untitled Sale',
    body.startDate || null,
    body.endDate || null,
    JSON.stringify(body.discounts || []),
    JSON.stringify(body.consignors || []),
    body.maxDiscountPercent ?? null,
    body.status || 'active',
    ts,
    ts
  ).run();

  const sale = await getSaleById(env, id);
  return json(rowToSale(sale), 201);
}

async function getSaleByCode(request, env, params) {
  const sale = await getSaleByShareCode(env, params.shareCode);
  if (!sale) return json({ error: 'Sale not found' }, 404);
  return json(rowToSale(sale));
}

async function patchSale(request, env, params) {
  const auth = await authSale(request, env, params.saleId);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const updates = [];
  const values = [];

  if ('name' in body)               { updates.push('name = ?');                values.push(body.name); }
  if ('startDate' in body)          { updates.push('start_date = ?');          values.push(body.startDate); }
  if ('endDate' in body)            { updates.push('end_date = ?');            values.push(body.endDate); }
  if ('discounts' in body)          { updates.push('discounts_json = ?');      values.push(JSON.stringify(body.discounts)); }
  if ('consignors' in body)         { updates.push('consignors_json = ?');     values.push(JSON.stringify(body.consignors)); }
  if ('maxDiscountPercent' in body) { updates.push('max_discount_percent = ?'); values.push(body.maxDiscountPercent); }
  if ('status' in body)             { updates.push('status = ?');              values.push(body.status); }
  if ('endedAt' in body)            { updates.push('ended_at = ?');            values.push(body.endedAt); }

  if (updates.length === 0) return json(rowToSale(auth.sale));

  updates.push('updated_at = ?');
  values.push(nowIso());
  values.push(params.saleId);

  await env.DB.prepare(`UPDATE sales SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  const sale = await getSaleById(env, params.saleId);
  return json(rowToSale(sale));
}

async function createInvoice(request, env, params) {
  const auth = await authSale(request, env, params.saleId);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const id = body.id || crypto.randomUUID();
  const ts = nowIso();

  // Server-assigned customer_number unless explicitly provided.
  // Concurrent inserts in D1 are rare at our volume (estate sale ops, low contention).
  let customerNumber = body.customerNumber;
  if (!customerNumber) {
    const row = await env.DB.prepare(
      'SELECT COALESCE(MAX(customer_number), 0) + 1 AS next FROM invoices WHERE sale_id = ?'
    ).bind(params.saleId).first();
    customerNumber = row?.next || 1;
  }

  await env.DB.prepare(`
    INSERT INTO invoices (
      id, sale_id, customer_number, order_name, items_json, subtotal, total,
      ticket_discount_json, sale_day, status, paid_at, voided_at, void_reason,
      created_at, updated_at, created_by_device
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.saleId,
    customerNumber,
    body.orderName || null,
    JSON.stringify(body.items || []),
    body.subtotal ?? 0,
    body.total ?? 0,
    body.ticketDiscount ? JSON.stringify(body.ticketDiscount) : null,
    body.saleDay || 1,
    body.status || 'open',
    body.paidAt || null,
    body.voidedAt || null,
    body.voidReason || null,
    body.createdAt || ts,
    ts,
    body.createdByDevice || null
  ).run();

  const invoice = await env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
  return json(rowToInvoice(invoice), 201);
}

async function listInvoices(request, env, params) {
  const auth = await authSale(request, env, params.saleId);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const since = url.searchParams.get('since');

  let query = 'SELECT * FROM invoices WHERE sale_id = ?';
  const values = [params.saleId];
  if (since) {
    query += ' AND updated_at > ?';
    values.push(since);
  }
  query += ' ORDER BY updated_at DESC';

  const result = await env.DB.prepare(query).bind(...values).all();

  // Re-fetch the sale fresh so its current status/consignors/discounts ride
  // along with each poll. Cheap (one indexed lookup) and lets clients react
  // to pauses, resumes, and ends without a separate endpoint.
  const sale = await getSaleById(env, params.saleId);

  return json({
    invoices: (result.results || []).map(rowToInvoice),
    sale: rowToSale(sale),
    syncedAt: nowIso()
  });
}

async function getInvoice(request, env, params) {
  // Public — UUIDs are unguessable; customer ticket page needs to fetch by id without auth.
  const invoice = await env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(params.invoiceId).first();
  if (!invoice) return json({ error: 'Invoice not found' }, 404);

  const sale = await getSaleById(env, invoice.sale_id);
  return json({
    invoice: rowToInvoice(invoice),
    sale: sale ? {
      name: sale.name,
      startDate: sale.start_date,
      endDate: sale.end_date
    } : null
  });
}

async function patchInvoice(request, env, params) {
  const auth = await authSale(request, env, params.saleId);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const updates = [];
  const values = [];

  if ('orderName' in body)      { updates.push('order_name = ?');           values.push(body.orderName); }
  if ('items' in body)          { updates.push('items_json = ?');           values.push(JSON.stringify(body.items)); }
  if ('subtotal' in body)       { updates.push('subtotal = ?');             values.push(body.subtotal); }
  if ('total' in body)          { updates.push('total = ?');                values.push(body.total); }
  if ('ticketDiscount' in body) { updates.push('ticket_discount_json = ?'); values.push(body.ticketDiscount ? JSON.stringify(body.ticketDiscount) : null); }
  if ('status' in body)         { updates.push('status = ?');               values.push(body.status); }
  if ('paidAt' in body)         { updates.push('paid_at = ?');              values.push(body.paidAt); }
  if ('voidedAt' in body)       { updates.push('voided_at = ?');            values.push(body.voidedAt); }
  if ('voidReason' in body)     { updates.push('void_reason = ?');          values.push(body.voidReason); }

  if (updates.length === 0) {
    const invoice = await env.DB.prepare('SELECT * FROM invoices WHERE id = ? AND sale_id = ?').bind(params.invoiceId, params.saleId).first();
    if (!invoice) return json({ error: 'Invoice not found' }, 404);
    return json(rowToInvoice(invoice));
  }

  updates.push('updated_at = ?');
  values.push(nowIso());
  values.push(params.invoiceId);
  values.push(params.saleId);

  const result = await env.DB.prepare(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ? AND sale_id = ?`).bind(...values).run();
  if (!result.meta?.changes) return json({ error: 'Invoice not found' }, 404);

  const invoice = await env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(params.invoiceId).first();
  return json(rowToInvoice(invoice));
}

// === Routing ===

const routes = [
  { method: 'POST',  pattern: /^\/sales$/,                                                handler: createSale },
  { method: 'GET',   pattern: /^\/sales\/by-code\/(?<shareCode>[A-Z0-9]+)$/,             handler: getSaleByCode },
  { method: 'PATCH', pattern: /^\/sales\/(?<saleId>[^/]+)$/,                              handler: patchSale },
  { method: 'POST',  pattern: /^\/sales\/(?<saleId>[^/]+)\/invoices$/,                    handler: createInvoice },
  { method: 'GET',   pattern: /^\/sales\/(?<saleId>[^/]+)\/invoices$/,                    handler: listInvoices },
  { method: 'GET',   pattern: /^\/invoices\/(?<invoiceId>[^/]+)$/,                        handler: getInvoice },
  { method: 'PATCH', pattern: /^\/sales\/(?<saleId>[^/]+)\/invoices\/(?<invoiceId>[^/]+)$/, handler: patchInvoice }
];

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Health / root
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ status: 'ok', service: 'estate-checkout-api', time: nowIso() });
    }

    // Route matching
    for (const route of routes) {
      if (request.method !== route.method) continue;
      const match = url.pathname.match(route.pattern);
      if (match) {
        try {
          return await route.handler(request, env, match.groups || {});
        } catch (err) {
          console.error('Handler error:', err.message, err.stack);
          return json({ error: 'Internal error', message: err.message }, 500);
        }
      }
    }

    return json({ error: 'Not found', path: url.pathname }, 404);
  }
};
