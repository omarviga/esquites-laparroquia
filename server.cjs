// server.cjs — API REST + SQLite (sql.js) para Esquites La Parroquia
const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'lovable.db');

let db;

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initSQL() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
}

const app = express();

// ─── helpers ────────────────────────────────────────────────
function uuid() { return randomUUID(); }
function now() { return new Date().toISOString(); }
function resJson(res, data) { res.json(data); }

function run(sql, params = []) {
  db.run(sql, params);
  const info = db.exec("SELECT last_insert_rowid() as lastID, changes() as changes");
  saveDB();
  const row = info[0]?.values?.[0];
  return { lastID: row?.[0] ?? 0, changes: row?.[1] ?? 0 };
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── init schema ────────────────────────────────────────────
function initDB() {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY, name TEXT, role TEXT, created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY, user_id TEXT, role TEXT, created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS settings_public (
        id TEXT PRIMARY KEY, key TEXT, value TEXT
      );

      CREATE TABLE IF NOT EXISTS sale_item_modifiers (
        id TEXT PRIMARY KEY, sale_item_id TEXT NOT NULL,
        modifier_name TEXT, extra_price REAL DEFAULT 0,
        FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY, business_name TEXT, slogan TEXT, address TEXT,
        phone TEXT, footer_message TEXT, printer_enabled INTEGER DEFAULT 0,
        printer_ip TEXT DEFAULT '', printer_port INTEGER DEFAULT 9100,
        printer_width INTEGER DEFAULT 80, auto_cut INTEGER DEFAULT 1,
        open_drawer INTEGER DEFAULT 0, print_mode TEXT DEFAULT 'proxy',
        proxy_url TEXT DEFAULT 'http://localhost:3128', show_logo INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10, iva_rate REAL DEFAULT 0.16,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL DEFAULT 0,
        category_id TEXT, active INTEGER DEFAULT 1, description TEXT,
        image_url TEXT, emoji TEXT, display_order INTEGER DEFAULT 0,
        created_at TEXT, FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS modifier_groups (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, required INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS modifiers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, modifier_group_id TEXT NOT NULL,
        extra_price REAL DEFAULT 0,
        FOREIGN KEY (modifier_group_id) REFERENCES modifier_groups(id)
      );

      CREATE TABLE IF NOT EXISTS product_modifiers (
        id TEXT PRIMARY KEY, product_id TEXT, modifier_id TEXT, modifier_group_id TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (modifier_id) REFERENCES modifiers(id),
        FOREIGN KEY (modifier_group_id) REFERENCES modifier_groups(id)
      );

      CREATE TABLE IF NOT EXISTS digital_menus (
        id TEXT PRIMARY KEY, filename TEXT, file_url TEXT, active INTEGER DEFAULT 0,
        uploaded_at TEXT
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT,
        loyalty_points INTEGER DEFAULT 0, created_by TEXT,
        created_at TEXT, updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY, folio TEXT, subtotal REAL DEFAULT 0,
        tax REAL DEFAULT 0, total REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'efectivo', cash_received REAL,
        change_amount REAL, status TEXT DEFAULT 'completada',
        kds_status TEXT DEFAULT 'pendiente', cancelled INTEGER DEFAULT 0,
        cancelled_at TEXT, is_courtesy INTEGER DEFAULT 0,
        discount REAL DEFAULT 0, discount_reason TEXT,
        cashier TEXT, user_id TEXT, created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, product_id TEXT,
        product_name TEXT, quantity INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0, modifiers TEXT,
        kds_item_status TEXT DEFAULT 'pendiente',
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, stock REAL DEFAULT 0,
        min_stock REAL DEFAULT 0, cost_per_unit REAL DEFAULT 0,
        unit TEXT DEFAULT 'pza', created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS product_recipes (
        id TEXT PRIMARY KEY, product_id TEXT NOT NULL,
        inventory_item_id TEXT NOT NULL, quantity REAL DEFAULT 1,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY, inventory_item_id TEXT NOT NULL,
        type TEXT NOT NULL, quantity REAL NOT NULL,
        stock_before REAL DEFAULT 0, stock_after REAL DEFAULT 0,
        reference_type TEXT, reference_id TEXT, notes TEXT,
        created_at TEXT,
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
      );

      CREATE TABLE IF NOT EXISTS cash_register (
        id TEXT PRIMARY KEY, user_id TEXT, opening_amount REAL DEFAULT 0,
        opening_breakdown TEXT, status TEXT DEFAULT 'abierta',
        opened_at TEXT, closed_at TEXT, closing_amount REAL DEFAULT 0,
        closing_breakdown TEXT, expected_amount REAL DEFAULT 0,
        real_amount REAL DEFAULT 0, difference REAL DEFAULT 0,
        total_sales_cash REAL DEFAULT 0, total_sales_card REAL DEFAULT 0,
        total_sales_transfer REAL DEFAULT 0, notes TEXT
      );

      CREATE TABLE IF NOT EXISTS cash_movements (
        id TEXT PRIMARY KEY, cash_register_id TEXT, amount REAL DEFAULT 0,
        type TEXT NOT NULL, concept TEXT, payment_method TEXT DEFAULT 'efectivo',
        notes TEXT, user_id TEXT, created_at TEXT,
        FOREIGN KEY (cash_register_id) REFERENCES cash_register(id)
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY, description TEXT, amount REAL DEFAULT 0,
        category TEXT, status TEXT DEFAULT 'pendiente',
        employee_name TEXT, period TEXT,
        created_at TEXT, paid_at TEXT, user_id TEXT
      );

      INSERT OR IGNORE INTO settings (id) VALUES ('default');
    `);
    saveDB();
    migrateSchema();
    console.log('✅ DB schema ready');
    cacheAllColumns();
    console.log('✅ Column cache ready');
  } catch (e) {
    console.error('Schema error:', e.message);
  }
}

// ─── Schema migration — add missing columns ────────────────
function migrateSchema() {
  const addCol = (table, colDef) => {
    try { db.run(`ALTER TABLE ${table} ADD COLUMN ${colDef}`); } catch (e) {
      // Error 1: duplicate column → already exists, safe to ignore
    }
  };
  // Stock movements — add columns that may be missing from old schema
  addCol('stock_movements', 'stock_before REAL DEFAULT 0');
  addCol('stock_movements', 'stock_after REAL DEFAULT 0');
  addCol('stock_movements', 'reference_type TEXT');
  addCol('stock_movements', 'reference_id TEXT');
  // Settings — add columns the client sends but may be missing from old schema
  addCol('settings', 'rfc TEXT DEFAULT ""');
  addCol('settings', 'whatsapp_number TEXT DEFAULT ""');
  addCol('settings', 'auto_print INTEGER DEFAULT 0');
  addCol('settings', 'logo_url TEXT DEFAULT ""');
  addCol('settings', 'logo_data TEXT DEFAULT ""');
  addCol('settings', 'payment_provider TEXT DEFAULT "none"');
  addCol('settings', 'mp_device_id TEXT DEFAULT ""');
  addCol('settings', 'zettle_api_key TEXT DEFAULT ""');
  addCol('settings', 'tax REAL DEFAULT 0');
  // Sales — ensure created_at is not null for sorting
  addCol('sales', 'kitchen_notes TEXT DEFAULT ""');
  addCol('sales', 'cancelled_by TEXT DEFAULT ""');
  saveDB();
}

// ─── Column cache — populate at startup ────────────────────
const tableCols = {};

function cacheAllColumns() {
  const tables = all("SELECT name FROM sqlite_master WHERE type='table'");
  for (const t of tables) {
    const cols = all(`PRAGMA table_info(${t.name})`);
    tableCols[t.name] = cols.map(c => c.name);
  }
}

function filterCols(table, data) {
  const cols = tableCols[table];
  if (!cols) return data;
  const out = {};
  for (const k of Object.keys(data)) {
    if (cols.includes(k)) out[k] = data[k];
  }
  return out;
}

async function runInsertSafe(table, body, pk = 'id') {
  let data = { ...body };
  if (!data[pk]) data[pk] = uuid();
  if (data.modifiers && typeof data.modifiers === 'object') {
    data.modifiers = JSON.stringify(data.modifiers);
  }
  data = filterCols(table, data);
  const colStr = Object.keys(data).join(', ');
  const valStr = Object.keys(data).map(() => '?').join(', ');
  return run(`INSERT INTO ${table} (${colStr}) VALUES (${valStr})`, Object.values(data));
}

async function runUpdateSafe(table, body, pk, id) {
  let data = { ...body };
  delete data[pk];
  if (data.modifiers && typeof data.modifiers === 'object') {
    data.modifiers = JSON.stringify(data.modifiers);
  }
  data = filterCols(table, data);
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const vals = Object.values(data);
  vals.push(id);
  return run(`UPDATE ${table} SET ${sets} WHERE ${pk} = ?`, vals);
}

function crudRoutes(table, pk = 'id') {
  // GET all
  app.get(`/api/${table}`, async (req, res) => {
    try {
      let sql = `SELECT * FROM ${table}`;
      const params = [];
      const filters = [];
      for (const [key, val] of Object.entries(req.query)) {
        if (key !== 'limit' && key !== 'offset') {
          filters.push(`${key} = ?`);
          params.push(val);
        }
      }
      if (filters.length) sql += ' WHERE ' + filters.join(' AND ');
      const order = req.query.orden || req.query.order;
      if (order) sql += ` ORDER BY ${order}`;
      if (req.query.limit) sql += ` LIMIT ?` && params.push(Number(req.query.limit));
      if (req.query.offset) sql += ` OFFSET ?` && params.push(Number(req.query.offset));

      const rows = all(sql, params);
      const parsed = rows.map(r => {
        if (r.modifiers && typeof r.modifiers === 'string') {
          try { r.modifiers = JSON.parse(r.modifiers); } catch {}
        }
        return r;
      });
      resJson(res, parsed);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET one
  app.get(`/api/${table}/:id`, async (req, res) => {
    try {
      const row = get(`SELECT * FROM ${table} WHERE ${pk} = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ error: 'Not found' });
      if (row.modifiers && typeof row.modifiers === 'string') {
        try { row.modifiers = JSON.parse(row.modifiers); } catch {}
      }
      resJson(res, row);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST (create)
  app.post(`/api/${table}`, async (req, res) => {
    try {
      const result = await runInsertSafe(table, req.body, pk);
      resJson(res, { ...req.body, lastID: result.lastID });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT (update)
  app.put(`/api/${table}/:id`, async (req, res) => {
    try {
      const result = await runUpdateSafe(table, req.body, pk, req.params.id);
      resJson(res, { changes: result.changes });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE
  app.delete(`/api/${table}/:id`, async (req, res) => {
    try {
      const result = run(`DELETE FROM ${table} WHERE ${pk} = ?`, [req.params.id]);
      resJson(res, { changes: result.changes });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

// ─── Custom endpoints FIRST ─────────────────────────────────

// Sales history
app.get('/api/sales/history', async (req, res) => {
  try {
    let where = ' WHERE 1=1';
    const params = [];

    const dateFrom = req.query.dateFrom || req.query.date_from;
    const dateTo = req.query.dateTo || req.query.date_to;
    const paymentMethod = req.query.paymentMethod || req.query.payment_method;
    const folioSearch = req.query.search || req.query.folio;
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'desc';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    if (status === 'cancelled') {
      where += ' AND s.cancelled = 1';
    } else if (status === 'active') {
      where += ' AND s.cancelled = 0';
    }
    // Default: no filter on cancelled

    if (dateFrom) { where += ' AND s.created_at >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND s.created_at <= ?'; params.push(dateTo + 'T23:59:59.999Z'); }
    if (paymentMethod) { where += ' AND s.payment_method = ?'; params.push(paymentMethod); }
    if (folioSearch) { where += ' AND (s.folio LIKE ? OR s.cashier LIKE ?)'; params.push(`%${folioSearch}%`, `%${folioSearch}%`); }

    const allowedSort = { created_at: 's.created_at', total: 's.total', folio: 's.folio' };
    const col = allowedSort[sortBy] || 's.created_at';
    const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countRow = get(`SELECT COUNT(*) as total FROM sales s${where}`, params);
    const total = countRow?.total || 0;

    const sql = `SELECT s.*, COALESCE(p.full_name, '') as cashier_name,
      c.name as customer_name
      FROM sales s
      LEFT JOIN profiles p ON s.user_id = p.id
      LEFT JOIN customers c ON s.customer_id = c.id
      ${where} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`;
    const rows = all(sql, [...params, limit, offset]);

    // Attach items to each sale
    for (const sale of rows) {
      sale.items = all(`SELECT * FROM sale_items WHERE sale_id = ?`, [sale.id]);
      // Parse modifiers JSON if present
      for (const item of sale.items) {
        if (item.modifiers && typeof item.modifiers === 'string') {
          try { item.modifiers = JSON.parse(item.modifiers); } catch {}
        }
      }
    }
    resJson(res, { sales: rows, total, page, pageSize: limit });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sales summary
app.get('/api/sales/summary', async (req, res) => {
  try {
    let where = ' WHERE 1=1';
    const params = [];

    const dateFrom = req.query.dateFrom || req.query.date_from;
    const dateTo = req.query.dateTo || req.query.date_to;

    if (dateFrom) { where += ' AND created_at >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND created_at <= ?'; params.push(dateTo + 'T23:59:59.999Z'); }

    const totals = get(`SELECT
      COUNT(*) as saleCount,
      COALESCE(SUM(CASE WHEN cancelled=0 THEN total ELSE 0 END), 0) as totalSales,
      COALESCE(SUM(CASE WHEN cancelled=1 THEN 1 ELSE 0 END), 0) as cancelledCount
      FROM sales${where}`, params);

    const saleCount = totals?.saleCount || 0;
    const activeSales = saleCount - (totals?.cancelledCount || 0);

    const paymentBreakdown = all(`SELECT
      payment_method as method, COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales${where} AND cancelled=0 GROUP BY payment_method`, params);

    const dailyTotals = all(`SELECT
      DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales${where} AND cancelled=0 GROUP BY DATE(created_at) ORDER BY date`, params);

    resJson(res, {
      totalSales: totals?.totalSales || 0,
      saleCount: activeSales,
      avgTicket: activeSales > 0 ? (totals?.totalSales || 0) / activeSales : 0,
      cancelledCount: totals?.cancelledCount || 0,
      paymentBreakdown: paymentBreakdown || [],
      dailyTotals: dailyTotals || [],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Save sale (custom handler to set created_at and cash_register_id)
app.post('/api/sales', async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.id) data.id = uuid();
    if (!data.created_at) data.created_at = now();
    const reg = get(`SELECT id FROM cash_register WHERE status = 'abierta' LIMIT 1`);
    if (reg) data.cash_register_id = reg.id;
    const result = runInsertSafe('sales', data);
    resJson(res, { ...data, lastID: result.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sale detail with items (overrides generic GET /api/sales/:id)
app.get('/api/sales/:id', async (req, res) => {
  try {
    const sale = get(`SELECT s.*, COALESCE(p.full_name, '') as cashier_name, c.name as customer_name FROM sales s LEFT JOIN profiles p ON s.user_id = p.id LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?`, [req.params.id]);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    sale.items = all(`SELECT * FROM sale_items WHERE sale_id = ?`, [sale.id]);
    for (const item of sale.items) {
      if (item.modifiers && typeof item.modifiers === 'string') {
        try { item.modifiers = JSON.parse(item.modifiers); } catch {}
      }
    }
    resJson(res, sale);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cash endpoints
app.get('/api/cash/status', async (req, res) => {
  try {
    const row = get(`SELECT id FROM cash_register WHERE status = 'abierta' LIMIT 1`);
    resJson(res, { open: !!row, registerId: row?.id || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cash/current', async (req, res) => {
  try {
    const register = get(`SELECT * FROM cash_register WHERE status = 'abierta' LIMIT 1`);
    if (!register) return resJson(res, { register: null, summary: null, movements: [] });
    const sales = all(`SELECT * FROM sales WHERE cancelled = 0 AND created_at >= ? AND created_at <= ?`,
      [register.opened_at, now()]);
    const movements = all(`SELECT * FROM cash_movements WHERE cash_register_id = ? ORDER BY created_at ASC`, [register.id]);
    const cashIn = movements.filter(m => m.type === 'entrada').reduce((a, m) => a + m.amount, 0);
    const cashOut = movements.filter(m => m.type === 'salida').reduce((a, m) => a + m.amount, 0);
    const salesCash = sales.filter(s => s.payment_method === 'efectivo').reduce((a, s) => a + s.total, 0);
    const salesCard = sales.filter(s => s.payment_method === 'tarjeta').reduce((a, s) => a + s.total, 0);
    const salesTransfer = sales.filter(s => s.payment_method === 'transferencia').reduce((a, s) => a + s.total, 0);
    const expectedCash = (register.opening_amount || 0) + salesCash + cashIn - cashOut;
    resJson(res, {
      register,
      summary: {
        sales_cash: salesCash, sales_card: salesCard, sales_transfer: salesTransfer,
        sales_count: sales.length, cash_in: cashIn, cash_out: cashOut,
        expected_cash: expectedCash,
      },
      movements,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cash/history', async (req, res) => {
  try {
    const rows = all(`SELECT * FROM cash_register WHERE status = 'cerrada' ORDER BY closed_at DESC`);
    resJson(res, rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cash/open', async (req, res) => {
  try {
    const openingAmount = req.body.openingAmount ?? req.body.amount ?? 0;
    const data = {
      id: uuid(), user_id: req.body.user_id || '',
      opening_amount: openingAmount,
      opening_breakdown: req.body.breakdown ? JSON.stringify(req.body.breakdown) : null,
      status: 'abierta', opened_at: now()
    };
    run(`INSERT INTO cash_register (${Object.keys(data).join(',')}) VALUES (${Object.keys(data).map(()=>'?').join(',')})`, Object.values(data));
    resJson(res, data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cash/close', async (req, res) => {
  try {
    const registerId = req.body.register_id || req.body.registerId;
    const realAmount = req.body.realAmount ?? req.body.real_amount ?? 0;
    const closingBreakdown = req.body.closing_breakdown || req.body.breakdown;
    const notes = req.body.notes;
    const q = registerId
      ? get(`SELECT * FROM cash_register WHERE id = ?`, [registerId])
      : get(`SELECT * FROM cash_register WHERE status = 'abierta' LIMIT 1`);
    if (!q) return res.status(404).json({ error: 'Caja no encontrada' });

    const register = q;
    const sales = all(`SELECT * FROM sales WHERE cancelled = 0 AND created_at >= ? AND created_at <= ?`,
      [register.opened_at, now()]);
    const total_sales_cash = sales.filter(s => s.payment_method === 'efectivo').reduce((a, s) => a + s.total, 0);
    const total_sales_card = sales.filter(s => s.payment_method === 'tarjeta').reduce((a, s) => a + s.total, 0);
    const total_sales_transfer = sales.filter(s => s.payment_method === 'transferencia').reduce((a, s) => a + s.total, 0);

    const movements = all(`SELECT * FROM cash_movements WHERE cash_register_id = ?`, [register.id]);
    const cashIn = movements.filter(m => m.type === 'entrada').reduce((a, m) => a + m.amount, 0);
    const cashOut = movements.filter(m => m.type === 'salida').reduce((a, m) => a + m.amount, 0);

    const expected_amount = (register.opening_amount || 0) + total_sales_cash + cashIn - cashOut;
    const diff = (realAmount || 0) - expected_amount;

    run(`UPDATE cash_register SET
      status='cerrada', closed_at=?, closing_amount=?,
      expected_amount=?, real_amount=?, difference=?,
      total_sales_cash=?, total_sales_card=?, total_sales_transfer=?, notes=?
      WHERE id=?`, [
      now(), realAmount || 0,
      expected_amount, realAmount || 0, diff,
      total_sales_cash, total_sales_card, total_sales_transfer, notes || null, register.id
    ]);
    if (closingBreakdown) {
      run(`UPDATE cash_register SET closing_breakdown=? WHERE id=?`, [JSON.stringify(closingBreakdown), register.id]);
    }
    resJson(res, { id: register.id, expected_amount, difference: diff, total_sales_cash, total_sales_card, total_sales_transfer });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cash/cut/:id', async (req, res) => {
  try {
    const r = get(`SELECT * FROM cash_register WHERE id = ?`, [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    const sales = all(`SELECT * FROM sales WHERE cancelled = 0 AND created_at >= ? AND created_at <= ?`, [r.opened_at, r.closed_at || now()]);
    const movements = all(`SELECT * FROM cash_movements WHERE cash_register_id = ?`, [req.params.id]);
    const topProducts = all(`SELECT product_name as name, SUM(quantity) as quantity FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE cancelled = 0 AND created_at >= ? AND created_at <= ?) GROUP BY product_name ORDER BY quantity DESC LIMIT 5`, [r.opened_at, r.closed_at || now()]);

    resJson(res, {
      id: r.id, cashierName: r.user_id || '',
      openedAt: r.opened_at, closedAt: r.closed_at,
      openingAmount: r.opening_amount, expectedAmount: r.expected_amount,
      realAmount: r.real_amount, difference: r.difference,
      salesCash: r.total_sales_cash, salesCard: r.total_sales_card,
      salesTransfer: r.total_sales_transfer, salesCount: sales.length,
      cashIn: movements.filter(m => m.type === 'entrada').reduce((a, m) => a + m.amount, 0),
      cashOut: movements.filter(m => m.type === 'salida').reduce((a, m) => a + m.amount, 0),
      closingBreakdown: r.closing_breakdown ? JSON.parse(r.closing_breakdown) : null,
      notes: r.notes, topProducts
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cash/movement', async (req, res) => {
  try {
    let cashRegisterId = req.body.cash_register_id;
    if (!cashRegisterId) {
      const reg = get(`SELECT id FROM cash_register WHERE status = 'abierta' LIMIT 1`);
      if (reg) cashRegisterId = reg.id;
    }
    const data = { id: uuid(), cash_register_id: cashRegisterId, amount: req.body.amount,
      type: req.body.type, concept: req.body.concept,
      payment_method: req.body.paymentMethod || req.body.payment_method || 'efectivo',
      notes: req.body.notes || null, user_id: req.body.user_id || '', created_at: now() };
    run(`INSERT INTO cash_movements (${Object.keys(data).join(',')}) VALUES (${Object.keys(data).map(()=>'?').join(',')})`, Object.values(data));
    resJson(res, data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// KDS — orders with items and modifiers
app.get('/api/kds/orders', async (req, res) => {
  try {
    const rows = all(`SELECT * FROM sales WHERE cancelled = 0 ORDER BY created_at DESC`);
    const result = rows.map(r => {
      const items = all(`SELECT * FROM sale_items WHERE sale_id = ?`, [r.id]);
      return {
        ...r,
        sale_items: items.map(i => ({
          ...i,
          sale_item_modifiers: all(`SELECT modifier_name FROM sale_item_modifiers WHERE sale_item_id = ?`, [i.id]),
        })),
        customers: r.customer_id
          ? get(`SELECT name FROM customers WHERE id = ?`, [r.customer_id]) || null
          : null,
      };
    });
    resJson(res, result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Analytics
app.get('/api/analytics/daily', async (req, res) => {
  try {
    const rows = all(`
      SELECT DATE(created_at) as date, COUNT(*) as sales_count,
        COALESCE(SUM(total),0) as total, COALESCE(SUM(discount),0) as discounts
      FROM sales WHERE cancelled = 0
      GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30
    `);
    resJson(res, rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/range', async (req, res) => {
  try {
    const rows = all(`
      SELECT DATE(created_at) as date, COUNT(*) as sales_count, COALESCE(SUM(total),0) as total
      FROM sales WHERE cancelled = 0 AND created_at >= ? AND created_at <= ?
      GROUP BY DATE(created_at) ORDER BY date
    `, [req.query.from || '1970-01-01', req.query.to || now()]);
    resJson(res, rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/top-products', async (req, res) => {
  try {
    const rows = all(`
      SELECT product_name, SUM(quantity) as total_qty, COALESCE(SUM(quantity * unit_price),0) as total
      FROM sale_items GROUP BY product_name ORDER BY total_qty DESC LIMIT 20
    `);
    resJson(res, rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Expenses pay
app.post('/api/expenses/:id/pay', async (req, res) => {
  try {
    run(`UPDATE expenses SET status='pagado', paid_at=? WHERE id=?`, [now(), req.params.id]);
    resJson(res, { ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Expenses summary
app.get('/api/expenses/summary', async (req, res) => {
  try {
    const params = [];
    let where = '';
    if (req.query.date_from) { where += ` AND created_at >= ?`; params.push(req.query.date_from); }
    if (req.query.date_to) { where += ` AND created_at <= ?`; params.push(req.query.date_to); }
    const row = get(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total,
        COALESCE(SUM(CASE WHEN status='pagado' THEN amount ELSE 0 END),0) as paid,
        COALESCE(SUM(CASE WHEN status='pendiente' THEN amount ELSE 0 END),0) as pending
      FROM expenses WHERE 1=1 ${where}
    `, params);
    resJson(res, row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Inventory summary
app.get('/api/inventory/summary', async (req, res) => {
  try {
    const items = all(`SELECT * FROM inventory_items`);
    const totalValue = items.reduce((a, i) => a + (i.stock || 0) * (i.cost_per_unit || 0), 0);
    const lowCount = items.filter(i => (i.stock || 0) <= (i.min_stock || 0)).length;
    resJson(res, { items, lowCount, totalValue, totalItems: items.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    const rows = all(`SELECT * FROM inventory_items WHERE stock <= min_stock`);
    resJson(res, rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/recipes-enriched/:productId', async (req, res) => {
  try {
    const rows = all(`
      SELECT pr.*, ii.name as item_name, ii.unit, ii.stock as current_stock
      FROM product_recipes pr
      JOIN inventory_items ii ON pr.inventory_item_id = ii.id
      WHERE pr.product_id = ?
    `, [req.params.productId]);
    resJson(res, rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/recipes-by-item/:itemId', async (req, res) => {
  try {
    const rows = all(`
      SELECT pr.*, p.name as product_name FROM product_recipes pr
      JOIN products p ON pr.product_id = p.id
      WHERE pr.inventory_item_id = ?
    `, [req.params.itemId]);
    resJson(res, rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/movements', async (req, res) => {
  try {
    let sql = `SELECT sm.*, ii.name as item_name FROM stock_movements sm
      JOIN inventory_items ii ON sm.inventory_item_id = ii.id`;
    const params = [];
    if (req.query.item_id) { sql += ` WHERE sm.inventory_item_id = ?`; params.push(req.query.item_id); }
    sql += ` ORDER BY sm.created_at DESC`;
    if (req.query.limit) { sql += ` LIMIT ?`; params.push(Number(req.query.limit)); }
    const rows = all(sql, params);
    resJson(res, rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/adjust', async (req, res) => {
  try {
    const { inventory_item_id, type, quantity, notes } = req.body;
    const item = get(`SELECT * FROM inventory_items WHERE id = ?`, [inventory_item_id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const stockBefore = item.stock || 0;
    let stockAfter = stockBefore;
    let qty = Number(quantity);

    if (type === 'entrada') {
      stockAfter = stockBefore + Math.abs(qty);
    } else if (type === 'salida') {
      qty = -Math.abs(qty);
      stockAfter = Math.max(0, stockBefore + qty);
    } else { // ajuste
      stockAfter = Math.max(0, qty);
      qty = stockAfter - stockBefore;
    }

    run(`UPDATE inventory_items SET stock = ? WHERE id = ?`, [stockAfter, inventory_item_id]);

    const movement = { id: uuid(), inventory_item_id, type, quantity: qty,
      stock_before: stockBefore, stock_after: stockAfter,
      reference_type: 'manual', reference_id: null,
      notes: notes || null, created_at: now() };
    run(`INSERT INTO stock_movements (${Object.keys(movement).join(',')}) VALUES (${Object.keys(movement).map(()=>'?').join(',')})`, Object.values(movement));
    resJson(res, movement);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/deduct-sale', async (req, res) => {
  try {
    const { items } = req.body; // [{productId, productName, quantity, saleId, folio}]
    for (const saleItem of items || []) {
      const recipes = all(`SELECT * FROM product_recipes WHERE product_id = ?`, [saleItem.productId]);
      for (const rcp of recipes) {
        const deductQty = (rcp.quantity || 0) * (saleItem.quantity || 1);
        const item = get(`SELECT * FROM inventory_items WHERE id = ?`, [rcp.inventory_item_id]);
        if (item) {
          const stockBefore = item.stock || 0;
          const stockAfter = Math.max(0, stockBefore - deductQty);
          run(`UPDATE inventory_items SET stock = ? WHERE id = ?`, [stockAfter, rcp.inventory_item_id]);
          const movement = { id: uuid(), inventory_item_id: rcp.inventory_item_id,
            type: 'salida', quantity: deductQty,
            stock_before: stockBefore, stock_after: stockAfter,
            reference_type: 'sale', reference_id: saleItem.saleId || null,
            notes: `Venta #${saleItem.folio || ''}: ${saleItem.productName || ''}`,
            created_at: now() };
          run(`INSERT INTO stock_movements (${Object.keys(movement).join(',')}) VALUES (${Object.keys(movement).map(()=>'?').join(',')})`, Object.values(movement));
        }
      }
    }
    resJson(res, { ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Digital menus public URL
app.get('/api/digital_menus/public-url', async (req, res) => {
  try {
    const menu = get(`SELECT * FROM digital_menus WHERE active = 1 LIMIT 1`);
    if (!menu) return resJson(res, { url: null });
    resJson(res, { url: menu.file_url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/digital_menus/activate', async (req, res) => {
  try {
    run(`UPDATE digital_menus SET active = 0`);
    run(`UPDATE digital_menus SET active = 1 WHERE id = ?`, [req.body.id]);
    resJson(res, { ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Generic CRUD routes (AFTER custom routes to avoid :id conflicts) ──
crudRoutes('settings');
crudRoutes('categories');
crudRoutes('products');
crudRoutes('modifier_groups');
crudRoutes('modifiers');
crudRoutes('product_modifiers');
crudRoutes('digital_menus');
crudRoutes('customers');
crudRoutes('sales');
crudRoutes('sale_items');
crudRoutes('inventory_items');
crudRoutes('product_recipes');
crudRoutes('stock_movements');
crudRoutes('sale_item_modifiers');
crudRoutes('cash_register');
crudRoutes('cash_movements');
crudRoutes('expenses');
crudRoutes('profiles');
crudRoutes('user_roles');
crudRoutes('settings_public');

// Static file serving for digital menus (PDF files stored in public/menus/)
app.use('/menus', express.static(path.join(__dirname, 'public', 'menus')));

// ─── Global error handlers ──────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  if (err.stack) console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason instanceof Error ? reason.message : reason);
});

// ─── Lock file (PID) para evitar duplicados ────────────────
const LOCK_PATH = path.join(__dirname, 'server.lock');
async function claimLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const oldPid = parseInt(fs.readFileSync(LOCK_PATH, 'utf8'), 10);
    if (oldPid > 0) {
      try {
        process.kill(oldPid, 0); // Checar si vive
        console.log(`⚰️ Matando servidor anterior (PID ${oldPid})...`);
        process.kill(oldPid, 'SIGTERM');
        await new Promise(r => setTimeout(r, 1500)); // Esperar que libere el puerto
      } catch {}
    }
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));
}

// ─── Start ──────────────────────────────────────────────────
(async () => {
  try {
    await initSQL();
    initDB();
    claimLock();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌽 API Esquites La Parroquia corriendo en http://0.0.0.0:${PORT}`);
      console.log(`📦 Base de datos: ${DB_PATH}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`💥 Puerto ${PORT} ocupado. Revisa el lock file (server.lock).`);
      } else {
        console.error('💥 Server error:', err.message);
      }
      process.exit(1);
    });
  } catch (e) {
    console.error('💥 Startup error:', e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
})();
