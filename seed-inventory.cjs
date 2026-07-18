// seed-inventory.cjs — Agrega insumos y recetas de ejemplo
const initSqlJs = require('sql.js');
const fs = require('fs');
const { randomUUID } = require('crypto');

const DB_PATH = require('path').join(__dirname, 'lovable.db');
const uuid = () => randomUUID();

(async () => {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  const run = (sql, params = []) => db.run(sql, params);
  const getMap = (sql) => {
    const stmt = db.prepare(sql);
    const map = {};
    while (stmt.step()) {
      const row = stmt.getAsObject();
      map[row.name] = row.id;
    }
    stmt.free();
    return map;
  };
  const getOne = (sql, params = []) => {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    return row;
  };

  const save = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

  // ─── 1. Inventory items ──────────────────────────────────────
  const inventoryItems = [
    { name: "Elote blanco", unit: "pza", stock: 60, min_stock: 20, cost_per_unit: 6.50 },
    { name: "Crema", unit: "kg", stock: 8, min_stock: 2, cost_per_unit: 38.00 },
    { name: "Mayonesa", unit: "kg", stock: 6, min_stock: 2, cost_per_unit: 32.00 },
    { name: "Queso rallado", unit: "kg", stock: 5, min_stock: 1.5, cost_per_unit: 58.00 },
    { name: "Chile en polvo", unit: "kg", stock: 2.5, min_stock: 0.5, cost_per_unit: 75.00 },
    { name: "Mantequilla", unit: "kg", stock: 4, min_stock: 1, cost_per_unit: 42.00 },
    { name: "Frijoles", unit: "kg", stock: 6, min_stock: 2, cost_per_unit: 22.00 },
    { name: "Totopos", unit: "pza", stock: 300, min_stock: 100, cost_per_unit: 2.50 },
    { name: "Cacahuate", unit: "kg", stock: 4, min_stock: 1, cost_per_unit: 50.00 },
    { name: "Papas fritas", unit: "pza", stock: 80, min_stock: 30, cost_per_unit: 8.00 },
    { name: "Chicharrón", unit: "kg", stock: 3, min_stock: 1, cost_per_unit: 65.00 },
    { name: "Takys", unit: "pza", stock: 60, min_stock: 20, cost_per_unit: 7.00 },
    { name: "Cheetos", unit: "pza", stock: 60, min_stock: 20, cost_per_unit: 7.00 },
    { name: "Churros", unit: "pza", stock: 50, min_stock: 15, cost_per_unit: 5.00 },
    { name: "Dulce de leche", unit: "kg", stock: 2, min_stock: 0.5, cost_per_unit: 85.00 },
    { name: "Vaso desechable chico", unit: "pza", stock: 200, min_stock: 50, cost_per_unit: 2.00 },
    { name: "Vaso desechable mediano", unit: "pza", stock: 150, min_stock: 40, cost_per_unit: 2.50 },
    { name: "Vaso desechable grande", unit: "pza", stock: 100, min_stock: 30, cost_per_unit: 3.00 },
    { name: "Cuchara desechable", unit: "pza", stock: 500, min_stock: 100, cost_per_unit: 0.50 },
    { name: "Servilleta", unit: "pza", stock: 1000, min_stock: 200, cost_per_unit: 0.30 },
  ];

  const itemMap = {};
  const existingItems = getMap('SELECT name, id FROM inventory_items');
  const now = new Date().toISOString();

  for (const item of inventoryItems) {
    if (existingItems[item.name]) {
      itemMap[item.name] = existingItems[item.name];
      console.log(`  ✓ ${item.name} (ya existe)`);
    } else {
      const id = uuid();
      run(`INSERT INTO inventory_items (id, name, unit, stock, min_stock, cost_per_unit, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, item.name, item.unit, item.stock, item.min_stock, item.cost_per_unit, now]);
      itemMap[item.name] = id;
      console.log(`  + ${item.name}`);
    }
  }

  // ─── 2. Products map ─────────────────────────────────────────
  const prodMap = getMap('SELECT name, id FROM products');

  // ─── 3. Recipes ──────────────────────────────────────────────
  const recipes = [
    { prod: "Elote Clásico",     items: [["Elote blanco", 1], ["Crema", 0.05], ["Mayonesa", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01]] },
    { prod: "Elote Especial",    items: [["Elote blanco", 1], ["Crema", 0.07], ["Mayonesa", 0.07], ["Mantequilla", 0.02], ["Queso rallado", 0.04], ["Chile en polvo", 0.01]] },
    { prod: "Elote La Parroquia",items: [["Elote blanco", 1], ["Crema", 0.08], ["Mayonesa", 0.08], ["Mantequilla", 0.03], ["Queso rallado", 0.05], ["Chile en polvo", 0.02], ["Cacahuate", 0.02]] },
    { prod: "Tostilokos",        items: [["Totopos", 30], ["Frijoles", 0.1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Tostilocos",        items: [["Totopos", 30], ["Frijoles", 0.1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Vaso chico",        items: [["Vaso desechable chico", 1], ["Cuchara desechable", 1], ["Elote blanco", 1], ["Crema", 0.04], ["Mayonesa", 0.04], ["Queso rallado", 0.02], ["Chile en polvo", 0.01]] },
    { prod: "Dorilokos",         items: [["Papas fritas", 1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01]] },
    { prod: "Dorilocos",         items: [["Papas fritas", 1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01]] },
    { prod: "Takilokos",         items: [["Takys", 1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Cacahuate japonés preparado", items: [["Cacahuate", 0.2], ["Crema", 0.03], ["Chile en polvo", 0.01]] },
    { prod: "Churrolokos",       items: [["Churros", 6], ["Crema", 0.05], ["Queso rallado", 0.03], ["Dulce de leche", 0.03]] },
    { prod: "Churrolocos",       items: [["Churros", 6], ["Crema", 0.05], ["Queso rallado", 0.03], ["Dulce de leche", 0.03]] },
    { prod: "Cheetolotes",       items: [["Cheetos", 1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Vaso mediano",      items: [["Vaso desechable mediano", 1], ["Cuchara desechable", 1], ["Elote blanco", 1.5], ["Crema", 0.06], ["Mayonesa", 0.06], ["Queso rallado", 0.04], ["Chile en polvo", 0.015]] },
    { prod: "Vaso grande",       items: [["Vaso desechable grande", 1], ["Cuchara desechable", 1], ["Elote blanco", 2], ["Crema", 0.08], ["Mayonesa", 0.08], ["Queso rallado", 0.05], ["Chile en polvo", 0.02]] },
    { prod: "Rufflelokos",       items: [["Papas fritas", 1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Sabriesquites",     items: [["Elote blanco", 1], ["Crema", 0.05], ["Mayonesa", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Papas lokas",       items: [["Papas fritas", 1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Chicharrón loko",   items: [["Chicharrón", 0.2], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Takilotes",         items: [["Takys", 1], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Chicharrolotes",    items: [["Chicharrón", 0.2], ["Crema", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01], ["Cacahuate", 0.02]] },
    { prod: "Frituras preparadas", items: [["Cheetos", 1], ["Crema", 0.03], ["Queso rallado", 0.02], ["Chile en polvo", 0.01]] },
    { prod: "Churros con crema y queso", items: [["Churros", 4], ["Crema", 0.04], ["Queso rallado", 0.03], ["Dulce de leche", 0.02]] },
    { prod: "Uchepos con elote", items: [["Elote blanco", 1], ["Crema", 0.04], ["Queso rallado", 0.02], ["Mayonesa", 0.04], ["Chile en polvo", 0.01]] },
    { prod: "Costillitas de Elote", items: [["Elote blanco", 1], ["Crema", 0.05], ["Mayonesa", 0.05], ["Queso rallado", 0.03], ["Chile en polvo", 0.01]] },
    { prod: "Papas doradas preparadas", items: [["Papas fritas", 1], ["Crema", 0.03], ["Queso rallado", 0.02], ["Chile en polvo", 0.01]] },
    { prod: "Frituras con verdura", items: [["Cheetos", 0.5], ["Crema", 0.02], ["Chile en polvo", 0.01]] },
  ];

  let recipeCount = 0;
  let skipped = 0;

  for (const recipe of recipes) {
    const productId = prodMap[recipe.prod];
    if (!productId) { console.log(`  ⚠ Producto "${recipe.prod}" no encontrado`); skipped++; continue; }

    for (const [itemName, qty] of recipe.items) {
      const itemId = itemMap[itemName];
      if (!itemId) { console.log(`  ⚠ Insumo "${itemName}" no encontrado`); continue; }

      const existing = getOne(`SELECT id FROM product_recipes WHERE product_id = ? AND inventory_item_id = ?`, [productId, itemId]);
      if (existing) {
        run(`UPDATE product_recipes SET quantity = ? WHERE product_id = ? AND inventory_item_id = ?`, [qty, productId, itemId]);
      } else {
        run(`INSERT INTO product_recipes (id, product_id, inventory_item_id, quantity) VALUES (?, ?, ?, ?)`,
          [uuid(), productId, itemId, qty]);
      }
      recipeCount++;
    }
  }

  save();
  console.log(`\n✅ ${Object.keys(itemMap).length} insumos, ${recipeCount} recetas (${skipped} productos omitidos)`);
  db.close();
})();
