/**
 * MUNNEM — Smart Retail ERP Frontend Application
 * Connected to Node.js + Express + MySQL Backend via MunnemAPI
 * Preserves existing MUNNEM UI/UX while enforcing real multi-business database persistence.
 */

const $ = s => document.querySelector(s);
var MXC = { sym: "₹", loc: "en-IN", code: "INR" };
var MXU = null;

const rosMoney = n => Math.round((Number(n) || 0) * 100) / 100;
const R = n => {
  const val = rosMoney(n);
  const hasDecimals = Math.abs(val - Math.round(val)) > 0.004;
  return (window.MXC ? MXC.sym : "₹") + val.toLocaleString(window.MXC ? MXC.loc : "en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
};
const K = n => (window.MXC ? MXC.sym : "₹") + (n < 1e4 ? (n / 1000).toFixed(1) : Math.round(n / 1000)) + "k";
const rosEsc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mxM = n => MXC.sym + rosMoney(n).toLocaleString(MXC.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mxD = s => {
  const d = new Date(s);
  return isNaN(d) ? String(s || "") : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const mxToday = () => new Date().toISOString().slice(0, 10);

const IC = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  box: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  users: "M16 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7M21 20v-2a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8",
  chart: "M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-9",
  pct: "M19 5L5 19M7 9a2 2 0 100-4 2 2 0 000 4M17 19a2 2 0 100-4 2 2 0 000 4",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14M21 21l-5-5",
  bell: "M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 004 0",
  help: "M12 21a9 9 0 100-18 9 9 0 000 18M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1-1.5 2M12 17h.01",
  plus: "M12 5v14M5 12h14",
  menu: "M4 6h16M4 12h16M4 18h16",
  left: "M15 6l-6 6 6 6",
  moon: "M20 14A8 8 0 0110 4a8 8 0 1010 10",
  dl: "M12 4v12M7 11l5 5 5-5M5 20h14",
  print: "M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  rupee: "M7 5h10M7 9h10M7 5c6 0 6 8 0 8l7 6",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  edit: "M4 20h4L19 9l-4-4L4 16z",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 100-6 3 3 0 000 6",
  check: "M5 13l4 4L19 7",
  up: "M7 17L17 7M8 7h9v9",
  dn: "M7 7l10 10M17 8v9H8"
};
const i = n => `<svg class="i" viewBox="0 0 24 24"><path d="${IC[n]}"/></svg>`;

// Live in-memory state hydrated strictly from MySQL backend (always starts empty until authenticated)
let PR = [];
let CU = [];
let IN = [];
let IT = [];
let ROS = {
  payments: [],
  movements: [],
  expenses: [],
  audit: [],
  purchaseList: [],
  settings: {
    shopName: "",
    owner: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    gstin: "",
    prefix: "INV",
    currency: "INR"
  },
  nextInvoice: 1
};
const MX = {
  v: 2,
  users: [],
  suppliers: [],
  pos: [],
  banks: [],
  btx: [],
  services: [],
  profile: {},
  cur: { sym: "₹", loc: "en-IN", code: "INR" },
  taxes: [
    { n: "GST 0%", r: 0 },
    { n: "GST 5%", r: 5 },
    { n: "GST 12%", r: 12 },
    { n: "GST 18%", r: 18 },
    { n: "GST 28%", r: 28 }
  ],
  tpl: { accent: "#10A37F", logo: "", head: "", foot: "", size: "A4" }
};

const CATS = ["Groceries", "Packaged Food", "Beverages", "Stationery", "Household"];
const SB = { Paid: "ok", Partial: "wn", Unpaid: "er" };
const ST = p => p[5] == 0 ? ["Out of stock", "er"] : p[5] <= p[6] ? ["Low stock", "wn"] : ["In stock", "ok"];
const RQ = p => Math.max(p[6] * 3 - p[5], 0);
const SC = p => p[5] == 0 ? "var(--er)" : p[5] <= p[6] ? "#D9A441" : "var(--ac)";

const S = {
  q: "",
  cat: "All",
  stf: "All",
  so: "n",
  pg: 1,
  ch: "d",
  it: "All",
  cart: [],
  cu: -1,
  pcu: -1,
  iv: 0,
  ivf: "All",
  pay: "UPI",
  supplyType: "same",
  rc: "",
  ds: 0,
  rt: "Sales",
  gtab: "Summary",
  st: "Business Profile",
  ct: "Purchases",
  bq: "",
  bc: "All",
  savingBill: false
};

let D = { d: { l: [], a: [], b: [] }, w: { l: [], a: [], b: [] }, m: { l: [], a: [], b: [] } };
const COL = ["#10A37F", "#1F2937", "#6B8FD6", "#D9A441", "#A0AEC0"];

const todayInvoices = () => IN.filter(n => {
  const d = n[7] ? new Date(n[7]) : new Date(n[2]);
  return !isNaN(d) && d.toDateString() === new Date().toDateString();
});
const todaySales = () => rosMoney(todayInvoices().reduce((a, n) => a + Number(n[3] || 0), 0));
const inventoryValue = () => rosMoney(PR.reduce((a, p) => a + Number(p[3] || 0) * Number(p[5] || 0), 0));
const rosOutstanding = n => Math.max(0, rosMoney(Number(n[3] || 0) - Number(n[6] || 0)));

/**
 * Hydrate frontend arrays from the backend's MySQL workspace snapshot.
 */
function applyWorkspace(ws) {
  if (!ws) return;
  const biz = ws.business || {};
  ROS.settings = {
    shopName: biz.business_name || "",
    owner: biz.owner_name || "",
    email: biz.email || "",
    phone: biz.phone || "",
    address: biz.address || "",
    city: biz.city || "",
    state: biz.state || "",
    pinCode: biz.pin_code || "",
    gstin: biz.gstin || "",
    prefix: biz.invoice_prefix || "INV",
    currency: biz.currency_code || "INR"
  };
  ROS.nextInvoice = Number(biz.next_invoice_number) || 1;

  MX.profile = {
    shopName: biz.business_name || "",
    owner: biz.owner_name || "",
    phone: biz.phone || "",
    state: biz.state || "",
    gstin: biz.gstin || ""
  };
  MX.cur = {
    code: biz.currency_code || "INR",
    sym: biz.currency_symbol || "₹",
    loc: biz.currency_locale || "en-IN"
  };
  Object.assign(MXC, MX.cur);

  MX.tpl = {
    accent: biz.tpl_accent || "#10A37F",
    size: biz.tpl_size || "A4",
    head: biz.tpl_header || "",
    foot: biz.tpl_footer || "",
    logo: biz.tpl_logo || ""
  };

  if (Array.isArray(ws.taxes) && ws.taxes.length) {
    MX.taxes = ws.taxes.map(t => ({ id: t.id, n: t.name, r: Number(t.rate) }));
  }

  // Products: [name, sku, category, purchase_price, selling_price, stock_quantity, min_stock_level, gst_rate, id, hsn_code]
  PR = (ws.products || []).map(p => [
    p.name,
    p.sku,
    p.category || "Groceries",
    Number(p.purchase_price || 0),
    Number(p.selling_price || 0),
    Number(p.stock_quantity || 0),
    Number(p.min_stock_level ?? 10),
    Number(p.gst_rate || 0),
    p.id,
    p.hsn_code || ""
  ]);

  // Customers: [name, phone, orders_count, total_purchases, outstanding_balance, city, credit_limit, id, email, address, gstin]
  CU = (ws.customers || []).map(c => [
    c.name,
    c.phone || "",
    Number(c.orders_count || 0),
    Number(c.total_purchases || 0),
    Number(c.outstanding_balance || 0),
    c.city || "",
    Number(c.credit_limit || 0),
    c.id,
    c.email || "",
    c.address || "",
    c.gstin || ""
  ]);

  const prodIndexById = new Map(PR.map((p, idx) => [Number(p[8]), idx]));
  const custIndexById = new Map(CU.map((c, idx) => [Number(c[7]), idx]));

  IN = [];
  IT = [];
  for (const inv of (ws.invoices || [])) {
    const dt = new Date(inv.invoice_date || inv.created_at);
    const dateLabel = isNaN(dt)
      ? String(inv.invoice_date || "")
      : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const custIdx = inv.customer_id && custIndexById.has(Number(inv.customer_id))
      ? custIndexById.get(Number(inv.customer_id))
      : null;

    IN.push([
      inv.invoice_number,
      inv.customer_name || "Walk-in Customer",
      dateLabel,
      Number(inv.grand_total || 0),
      inv.payment_method || "Cash",
      inv.payment_status || "Paid",
      Number(inv.paid_amount || 0),
      !isNaN(dt) ? dt.toISOString() : new Date().toISOString(),
      Number(inv.discount_amount || 0),
      custIdx,
      inv.id,
      inv.supply_type || "same",
      Number(inv.subtotal || 0),
      Number(inv.taxable_amount || 0),
      Number(inv.cgst_amount || 0),
      Number(inv.sgst_amount || 0),
      Number(inv.igst_amount || 0),
      Number(inv.total_tax || 0),
      Number(inv.balance_due || 0)
    ]);

    const lines = (inv.items || []).map(item => {
      const pIdx = item.product_id && prodIndexById.has(Number(item.product_id))
        ? prodIndexById.get(Number(item.product_id))
        : -1;
      return [
        pIdx,
        Number(item.quantity || 1),
        item.product_name,
        Number(item.unit_price || 0),
        Number(item.gst_rate || 0),
        Number(item.purchase_price || 0),
        item.sku || "",
        item.category || "Groceries",
        Number(item.line_total || 0),
        Number(item.taxable_value || 0),
        Number(item.tax_amount || 0)
      ];
    });
    IT.push(lines);
  }

  ROS.payments = (ws.payments || []).map(p => ({
    id: p.id,
    code: p.payment_code,
    invoiceId: p.invoice_id,
    invoice: p.invoice_number,
    customer: p.customer_name,
    amount: Number(p.amount || 0),
    method: p.payment_method,
    ref: p.reference || "",
    at: p.payment_date || p.created_at
  }));

  ROS.movements = (ws.movements || []).map(m => ({
    id: m.id,
    at: m.created_at,
    product: m.product_name,
    sku: m.sku,
    type: m.movement_type,
    qty: Number(m.quantity_change || 0),
    reference: m.reference || "",
    balance: Number(m.balance_after || 0)
  }));

  ROS.expenses = (ws.expenses || []).map(e => ({
    id: e.id,
    code: e.expense_code,
    title: e.title,
    category: e.category,
    amount: Number(e.amount || 0),
    date: String(e.expense_date || "").slice(0, 10),
    notes: e.notes || "",
    at: e.created_at
  }));

  MX.suppliers = (ws.suppliers || []).map(s => ({
    id: s.id,
    name: s.name,
    phone: s.phone || "",
    email: s.email || "",
    gstin: s.gstin || "",
    address: s.address || ""
  }));

  MX.pos = (ws.purchaseOrders || []).map(po => ({
    dbId: po.id,
    id: po.po_number,
    sup: po.supplier_id,
    supplierName: po.supplier_name,
    date: String(po.order_date || "").slice(0, 10),
    status: po.status,
    total: Number(po.total_amount || 0),
    paid: Number(po.paid_amount || 0),
    note: po.note || "",
    rat: po.received_at,
    lines: (po.lines || []).map(l => ({
      productId: l.product_id,
      sku: l.sku,
      name: l.product_name,
      qty: Number(l.quantity || 1),
      cost: Number(l.unit_cost || 0)
    }))
  }));

  MX.services = (ws.services || []).map(s => ({
    id: s.id,
    name: s.name,
    unit: s.unit || "job",
    price: Number(s.price || 0),
    tax: Number(s.tax_rate || 0),
    desc: s.description || "",
    active: !!s.is_active
  }));

  MX.banks = (ws.bankAccounts || []).map(b => ({
    id: b.id,
    name: b.name,
    type: b.account_type || "Bank",
    open: Number(b.opening_balance || 0)
  }));

  MX.btx = (ws.bankTransactions || []).map(t => ({
    id: t.id,
    acc: t.account_id,
    type: t.tx_type,
    amt: Number(t.amount || 0),
    date: String(t.tx_date || "").slice(0, 10),
    note: t.note || ""
  }));

  ROS.purchaseList = (ws.purchaseList || []).map(x => ({
    id: x.id,
    productId: x.product_id,
    sku: x.sku,
    name: x.product_name,
    qty: Number(x.quantity || 1),
    unitCost: Number(x.unit_cost || 0)
  }));

  ROS.audit = (ws.auditLogs || []).map(a => ({
    id: a.id,
    at: a.created_at,
    action: a.action,
    detail: a.detail || ""
  }));

  MX.users = (ws.users || []).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: !!u.is_active,
    at: u.created_at
  }));

  rosBuildSalesCharts();
  updateNotificationsDropdown();
  mxDeco();
}

function updateNotificationsDropdown() {
  const d1 = $("#d1");
  const bn = $("#bn");
  if (!d1 || !bn) return;

  const alerts = [];
  const outOfStock = PR.filter(p => p[5] === 0);
  const lowStock = PR.filter(p => p[5] > 0 && p[5] <= p[6]);
  const unpaidInvoices = IN.filter(n => rosOutstanding(n) > 0);

  outOfStock.slice(0, 3).forEach(p => {
    alerts.push(`<a onclick="go('inventory')">Out of stock: ${rosEsc(p[0])}</a>`);
  });
  lowStock.slice(0, 3).forEach(p => {
    alerts.push(`<a onclick="go('inventory')">Low stock: ${rosEsc(p[0])} (${p[5]} left)</a>`);
  });
  unpaidInvoices.slice(0, 3).forEach(n => {
    alerts.push(`<a onclick="S.iv=${IN.indexOf(n)};go('invoice')">Payment due: ${rosEsc(n[1])} (${R(rosOutstanding(n))})</a>`);
  });

  if (alerts.length) {
    d1.innerHTML = alerts.join("");
    bn.innerHTML = i("bell") + '<span class="dot"></span>';
  } else {
    d1.innerHTML = `<a class="sub" style="cursor:default">All caught up — no pending alerts</a>`;
    bn.innerHTML = i("bell");
  }
}

function rosBuildSalesCharts() {
  const valid = IN.map((n, idx) => ({ n, idx, d: new Date(n[7] || n[2]) })).filter(x => !isNaN(x.d));
  const sumBetween = (start, end) => valid.reduce((a, x) => a + (x.d >= start && x.d < end ? Number(x.n[3] || 0) : 0), 0);
  const dayStart = d => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const today = dayStart(new Date());

  const dayLabels = [], dayA = [], dayB = [];
  for (let j = 6; j >= 0; j--) {
    const d = new Date(today);
    d.setDate(d.getDate() - j);
    const e = new Date(d);
    e.setDate(e.getDate() + 1);
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 7);
    const prevEnd = new Date(prev);
    prevEnd.setDate(prevEnd.getDate() + 1);
    dayLabels.push(d.toLocaleDateString("en-IN", { weekday: "short" }));
    dayA.push(rosMoney(sumBetween(d, e)));
    dayB.push(rosMoney(sumBetween(prev, prevEnd)));
  }

  const weekLabels = [], weekA = [], weekB = [];
  const monday = d => {
    const x = dayStart(d);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const thisMonday = monday(today);
  for (let j = 5; j >= 0; j--) {
    const st = new Date(thisMonday);
    st.setDate(st.getDate() - j * 7);
    const en = new Date(st);
    en.setDate(en.getDate() + 7);
    const prev = new Date(st);
    prev.setDate(prev.getDate() - 42);
    const prevEnd = new Date(prev);
    prevEnd.setDate(prevEnd.getDate() + 7);
    weekLabels.push("W" + (6 - j));
    weekA.push(rosMoney(sumBetween(st, en)));
    weekB.push(rosMoney(sumBetween(prev, prevEnd)));
  }

  const monthLabels = [], monthA = [], monthB = [];
  const firstMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  for (let j = 0; j < 3; j++) {
    const st = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + j, 1);
    const en = new Date(st.getFullYear(), st.getMonth() + 1, 1);
    const prev = new Date(st.getFullYear(), st.getMonth() - 3, 1);
    const prevEnd = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
    monthLabels.push(st.toLocaleDateString("en-IN", { month: "short" }));
    monthA.push(rosMoney(sumBetween(st, en)));
    monthB.push(rosMoney(sumBetween(prev, prevEnd)));
  }

  D = {
    d: { l: dayLabels, a: dayA, b: dayB },
    w: { l: weekLabels, a: weekA, b: weekB },
    m: { l: monthLabels, a: monthA, b: monthB }
  };
}

// SVG Chart Helpers
function area(c) {
  const hasAnySales = c && Array.isArray(c.a) && c.a.some(v => v > 0) || (c && Array.isArray(c.b) && c.b.some(v => v > 0));
  if (!hasAnySales) {
    return `<div class="sub" style="padding:50px 16px;text-align:center">No sales recorded yet</div>`;
  }
  const w = 640, h = 230, p = 40, mx = Math.max(1, ...c.a, ...c.b) * 1.1, n = c.a.length;
  const x = j => p + (n === 1 ? 0 : j * (w - p - 10) / (n - 1));
  const y = v => h - 26 - v / mx * (h - 44);
  const pt = s => s.map((v, j) => x(j) + "," + y(v)).join(" ");
  let g = "";
  for (let t = 0; t < 4; t++) {
    const v = mx * t / 3;
    g += `<line x1="${p}" x2="${w - 6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--bd)"/><text x="${p - 6}" y="${y(v) + 4}" font-size="10" fill="var(--t2)" text-anchor="end">${K(v)}</text>`;
  }
  const bw = (w - p) / n;
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%"><defs><linearGradient id="gr" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#10A37F" stop-opacity=".28"/><stop offset="1" stop-color="#10A37F" stop-opacity="0"/></linearGradient></defs>${g}<polygon points="${x(0)},${h - 26} ${pt(c.a)} ${x(n - 1)},${h - 26}" fill="url(#gr)"/><polyline points="${pt(c.b)}" fill="none" stroke="#A0AEC0" stroke-width="2" stroke-dasharray="5 4"/><polyline points="${pt(c.a)}" fill="none" stroke="#10A37F" stroke-width="2.5"/>${c.l.map((t, j) => `<text x="${x(j)}" y="${h - 8}" font-size="10.5" fill="var(--t2)" text-anchor="middle">${t}</text><rect class="hr" x="${x(j) - bw / 2}" y="0" width="${bw}" height="${h - 26}" data-tip="<b>${t}</b><br>Current ${R(c.a[j])}<br>Previous ${R(c.b[j])}"/>`).join("")}</svg>`;
}

function bars(v, l, col = "#10A37F") {
  if (!v || !v.some(x => x > 0)) {
    return `<div class="sub" style="padding:36px 12px;text-align:center">No data recorded yet</div>`;
  }
  const mx = Math.max(1, ...v);
  return `<div style="display:flex;gap:10px;align-items:flex-end;height:150px">${v.map((a, j) => `<div style="flex:1;text-align:center;font-size:11px;color:var(--t2)" data-tip="${l[j]}: ${R(a)}"><div style="height:${a / mx * 115}px;background:${col};border-radius:6px 6px 0 0;margin-bottom:6px;opacity:.9"></div>${l[j]}</div>`).join("")}</div>`;
}

function dn(v, l, sz = 130) {
  const t = v.reduce((a, b) => a + b, 0), C = 251.3;
  if (!t) return `<div class="sub" style="padding:36px 12px;text-align:center">No sales recorded yet</div>`;
  let o = 0;
  return `<div class="row wr"><svg viewBox="0 0 100 100" width="${sz}" height="${sz}"><g transform="rotate(-90 50 50)">${v.map((a, j) => {
    const s = `<circle cx="50" cy="50" r="40" fill="none" stroke="${COL[j % COL.length]}" stroke-width="14" stroke-dasharray="${a / t * C} ${C}" stroke-dashoffset="${-o}" data-tip="${l[j]}: ${Math.round(a / t * 100)}%"/>`;
    o += a / t * C;
    return s;
  }).join("")}</g></svg><div style="flex:1;min-width:130px">${l.map((a, j) => `<div class="tl"><span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${COL[j % COL.length]};margin-right:7px"></i>${a}</span><b>${Math.round(v[j] / t * 100)}%</b></div>`).join("")}</div></div>`;
}

const spk = a => {
  const m = Math.max(...a), n = Math.min(...a);
  return `<svg width="70" height="24"><polyline fill="none" stroke="var(--ac)" stroke-width="1.8" points="${a.map((v, j) => j * 70 / (a.length - 1) + "," + (22 - (v - n) / (m - n || 1) * 20)).join(" ")}"/></svg>`;
};

// UI Helpers
const T = (m, e) => {
  const d = document.createElement("div");
  d.className = "ts" + (e ? " e" : "");
  d.textContent = m;
  $("#ts").append(d);
  setTimeout(() => d.remove(), 3200);
};
const M = h => {
  $("#mo").innerHTML = `<div class="ov" onclick="if(event.target==this)X()"><div class="md">${h}</div></div>`;
};
const X = () => {
  $("#mo").innerHTML = "";
};
const dd = id => {
  const e = $("#" + id), o = e.classList.contains("o");
  document.querySelectorAll(".dd").forEach(x => x.classList.remove("o"));
  if (!o) e.classList.add("o");
};
const go = h => {
  location.hash = h;
};
const fl = (inp, tbId) => {
  const q = $(inp).value.toLowerCase();
  document.querySelectorAll(tbId + " tr").forEach(r => {
    r.hidden = !r.textContent.toLowerCase().includes(q);
  });
};
const ph = (t, s, a = "") => `<div class="ph"><div><h1>${t}</h1><div class="sub">${s}</div></div><div class="row wr">${a}</div></div>`;
const cd = (t, s, b, x = "") => `<div class="card ${x}"><div class="row sb" style="margin-bottom:12px"><div><h3>${t}</h3>${s ? `<div class="sub">${s}</div>` : ""}</div></div>${b}</div>`;
const sm = a => `<div class="g g4">${a.map(([l, v, s]) => `<div class="card k"><div class="l">${l}</div><div class="n">${v}</div><div class="sub">${s || ""}</div></div>`).join("")}</div>`;
const tb = (h, rows, id = "") => `<div class="tw"><table><thead><tr>${h.map(x => `<th class="${/^[₹#]|Amount|Qty|Price|Total|Stock|Units|Revenue|Due|Balance|Min|GST|Tax|CGST|SGST|IGST|Paid|Orders|Purchases/.test(x) ? "r" : ""}">${x}</th>`).join("")}</tr></thead><tbody ${id ? `id="${id}"` : ""}>${rows}</tbody></table></div>`;
const tabs = (a, cur, fn) => `<div class="tabs">${a.map(x => `<a class="${x == cur ? "on" : ""}" onclick="${fn}('${x}')">${x}</a>`).join("")}</div>`;
const em = (t, s, b) => `<div class="em">${i("search")}<b>${t}</b>${s}<div class="mt">${b}</div></div>`;
const op = (a, c) => a.map(x => `<option ${x == c ? "selected" : ""}>${x}</option>`).join("");

const mxIn = (l, id, v = "", t = "text", x = "") => `<label class="f">${l}<input class="in" id="${id}" type="${t}" value="${rosEsc(v)}" ${x}></label>`;
const mxTbl = (c, r) => r.length ? `<div class="tw"><table><thead><tr>${c.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${r.join("")}</tbody></table></div>` : "";
const mxEmpty = (t, s, b = "") => `<div class="card" style="text-align:center;padding:34px"><h3>${t}</h3><div class="sub" style="margin:6px 0 14px">${s}</div>${b}</div>`;
const mxKpi = a => `<div class="mxk">${a.map(([l, v]) => `<div class="card"><span class="sub">${l}</span><b>${v}</b></div>`).join("")}</div>`;
const mxBtns = (c, ok) => `<div class="err" id="mxe"></div><div class="row" style="justify-content:flex-end"><button class="btn" onclick="X()">Cancel</button><button class="btn p" onclick="${c}">${ok}</button></div>`;
const mxErr = m => {
  const e = $("#mxe") || $("#ra_x");
  if (e) e.textContent = m;
  return false;
};

const PA = {
  overview: ["New Bill", "go('billing')"],
  products: ["Add Product", "pf(-1)"],
  inventory: ["Update Stock", "sf()"],
  billing: ["Invoice History", "go('invoices')"],
  invoices: ["New Bill", "go('billing')"],
  customers: ["Add Customer", "cf()"],
  reports: ["Export CSV", "rosReportCSV()"],
  gst: ["Create invoice", "go('billing')"]
};

const V = {};

// ============================================================================
// 1. OVERVIEW / DYNAMIC DASHBOARD
// ============================================================================
V.overview = () => {
  const now = new Date();
  const g = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const today = todayInvoices();
  const sales = rosMoney(today.reduce((a, n) => a + Number(n[3] || 0), 0));
  const received = rosMoney(
    ROS.payments
      .filter(p => {
        const d = new Date(p.at);
        return !isNaN(d) && d.toDateString() === now.toDateString();
      })
      .reduce((a, p) => a + Number(p.amount || 0), 0)
  );
  const pending = rosMoney(today.reduce((a, n) => a + rosOutstanding(n), 0));
  const profit = rosMoney(
    today.reduce((a, n) => {
      const ix = IN.indexOf(n);
      const items = IT[ix] || [];
      return a + items.reduce((v, line) => {
        const sell = Number(line[3] ?? PR[line[0]]?.[4] ?? 0);
        const cost = Number(line[5] ?? PR[line[0]]?.[3] ?? 0);
        const qty = Number(line[1] || 0);
        return v + (sell - cost) * qty;
      }, 0);
    }, 0)
  );
  const stock = inventoryValue();
  const low = PR.filter(p => p[5] > 0 && p[5] <= p[6]);
  const zero = PR.filter(p => p[5] === 0);
  const customerDue = rosMoney(IN.reduce((a, n) => a + rosOutstanding(n), 0));
  const dueCustomers = CU.filter(c => customerStats(c).outstanding > 0).length;
  const unpaid = IN.filter(n => n[5] !== "Paid");
  const unpaidBalance = rosMoney(unpaid.reduce((a, n) => a + rosOutstanding(n), 0));

  const dailyTrend = D.d.a.length ? D.d.a : [0, 0, 0, 0, 0, 0, 0];
  const metrics = [
    ["Today’s Sales", R(sales), today.length ? "From today’s saved bills" : "No sales recorded today", "rupee", "Daily", dailyTrend, "up"],
    ["Orders Today", String(today.length), "Bills created today", "receipt", "Daily", dailyTrend.map(v => v > 0 ? 1 : 0), "up"],
    ["Money Received", R(received), "Payments recorded today", "check", "Daily", dailyTrend, "up"],
    ["Pending from Today’s Bills", R(pending), "Balance on today’s bills", "alert", "Daily", dailyTrend, pending ? "dn" : "up"],
    ["Estimated Gross Profit", R(profit), "Selling price less purchase cost", "chart", "Daily", dailyTrend, "up"],
    ["Inventory Value", R(stock), `${PR.length} products in catalogue`, "box", "Cumulative", [stock, stock], "up"]
  ];

  // Top-selling products across all saved invoices (or today if available)
  const sourceInvoices = today.length ? today : IN;
  const productSales = {};
  sourceInvoices.forEach(n => {
    const idx = IN.indexOf(n);
    (IT[idx] || []).forEach(line => {
      const name = line[2] || PR[line[0]]?.[0] || "Item";
      const qty = Number(line[1] || 0);
      const rev = Number(line[3] ?? PR[line[0]]?.[4] ?? 0) * qty;
      if (!productSales[name]) productSales[name] = { qty: 0, rev: 0 };
      productSales[name].qty += qty;
      productSales[name].rev += rev;
    });
  });
  const tp = Object.entries(productSales)
    .map(([name, st]) => [name, st.qty, rosMoney(st.rev)])
    .sort((a, b) => b[2] - a[2])
    .slice(0, 5);

  const catNames = ["Groceries", "Packaged Food", "Beverages", "Stationery", "Household Essentials"];
  const catKeys = ["Groceries", "Packaged Food", "Beverages", "Stationery", "Household"];
  const catValues = catKeys.map(c =>
    sourceInvoices.reduce((sum, n) => {
      const ix = IN.indexOf(n);
      return sum + (IT[ix] || []).reduce((v, line) => {
        const cat = line[7] || PR[line[0]]?.[2] || "Groceries";
        const price = Number(line[3] ?? PR[line[0]]?.[4] ?? 0);
        const qty = Number(line[1] || 0);
        return v + (cat === c ? price * qty : 0);
      }, 0);
    }, 0)
  );

  const lw = [...zero, ...low].slice(0, 6);
  const dayLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return `<div class="ph"><div><h1>${g}, ${rosEsc(((window.MXU && MXU.name) || "").split(" ")[0] || "there")}</h1><div class="sub">${rosEsc(ROS.settings.shopName || "My Business")}${ROS.settings.state ? " · " + rosEsc(ROS.settings.state) : ""} · ${dayLabel}</div></div><div class="row wr"><span class="tag">Live MySQL Workspace</span><button class="btn p" onclick="go('billing')">${i("plus")}New Bill</button></div></div>
<div class="g g3">${metrics.map(k => `<div class="card k"><div class="row sb"><span class="ic">${i(k[3])}</span><span class="tag">${k[4]}</span></div><div class="n">${k[1]}</div><div class="row sb"><div><div class="l">${k[0]}</div><div class="d ${k[6]}">${k[2]}</div></div>${spk(k[5])}</div></div>`).join("")}</div>
<div class="g g21"><div class="card"><div class="row sb wr" style="margin-bottom:8px"><div><h3>Sales performance</h3><div class="sub">Actual saved sales · current vs previous period</div></div>${tabs(["Daily", "Weekly", "Monthly"], { d: "Daily", w: "Weekly", m: "Monthly" }[S.ch], "sc")}</div><div id="ch">${area(D[S.ch])}</div><div class="row sub"><span><i style="display:inline-block;width:14px;height:3px;background:var(--ac);margin-right:6px"></i>Current</span><span><i style="display:inline-block;width:14px;height:3px;background:#A0AEC0;margin-right:6px"></i>Previous</span></div></div>
${cd("Sales by category", "Share of recorded revenue", dn(catValues, catNames))}</div>
<div class="g g2">${cd(
    "Top-selling products",
    today.length ? "Units sold and revenue across today’s bills" : "Units sold and revenue across saved bills",
    tp.length
      ? tb(["Product", "Units", "Revenue", "Share"], tp.map(t => `<tr><td>${rosEsc(t[0])}</td><td class="r">${t[1]}</td><td class="r">${R(t[2])}</td><td><div class="bar"><i style="width:${tp[0] && tp[0][2] ? t[2] / tp[0][2] * 100 : 0}%;background:var(--ac)"></i></div></td></tr>`).join(""))
      : `<div class="sub" style="padding:28px 12px;text-align:center">No sales recorded yet. Create a bill to track top-selling products.</div>`
  )}
${cd(
    "Inventory intelligence",
    "Low-stock and out-of-stock products needing attention",
    lw.length
      ? tb(["Product", "Stock", "Status", "Reorder"], lw.map(p => `<tr><td>${rosEsc(p[0])}</td><td class="r">${p[5]}</td><td><span class="b ${ST(p)[1]}">${ST(p)[0]}</span></td><td class="r">${RQ(p)} units</td></tr>`).join(""))
      : `<div class="sub" style="padding:28px 12px;text-align:center">${PR.length ? "All products are adequately stocked above minimum levels." : "No products added yet. Add products to monitor inventory."}</div>`
  )}</div>
<div class="g g2"><div class="card act"><h3 style="margin-bottom:6px">Action Centre</h3>${[
    ["alert", `${dueCustomers} customers owe ${R(customerDue)}`, "Outstanding customer balances", "View customers", "go('customers')"],
    ["layers", `${zero.length + low.length} products need reordering`, `${zero.length} out of stock, ${low.length} below minimum`, "Review stock", "go('inventory')"],
    ["receipt", `${unpaid.length} invoices not fully paid`, `Pending balance ${R(unpaidBalance)}`, "Open invoices", "go('invoices')"],
    ["pct", "Review GST summary", "Calculated from saved database invoices", "View GST", "go('gst')"]
  ].map(a => `<div class="al"><span class="ic">${i(a[0])}</span><div><b>${a[1]}</b><div class="sub">${a[2]}</div></div><button class="btn s" onclick="${a[4]}">${a[3]}</button></div>`).join("")}</div>
${cd("Quick actions", "", `<div class="row wr">${[
    ["Create New Bill", "plus", "go('billing')", 1],
    ["Add Product", "box", "pf(-1)"],
    ["Update Stock", "layers", "sf()"],
    ["Add Customer", "users", "cf()"],
    ["View Reports", "chart", "go('reports')"]
  ].map(a => `<button class="btn ${a[3] ? "p" : ""}" onclick="${a[2]}">${i(a[1])}${a[0]}</button>`).join("")}</div><div class="sub mt">All metrics are calculated dynamically from your business's MySQL database records.</div>`)}</div>
${cd(
    "Recent transactions",
    "Latest saved bills",
    IN.length
      ? `<div class="row wr" style="margin-bottom:10px"><input class="in" id="rq" style="max-width:260px" placeholder="Search invoice or customer" oninput="fl('#rq','#rt')"><select class="in" style="width:auto" onchange="fl2(this.value)"><option>All</option><option>Paid</option><option>Partial</option><option>Unpaid</option></select><a class="btn s" style="margin-left:auto" onclick="go('invoices')">View all</a></div>` +
        tb(["Invoice", "Customer", "Date", "Amount", "Method", "Status"], IN.slice(0, 6).map((n, j) => `<tr class="ck" onclick="S.iv=${j};go('invoice')"><td><b>${rosEsc(n[0])}</b></td><td>${rosEsc(n[1])}</td><td>${rosEsc(n[2])}</td><td class="r">${R(n[3])}</td><td>${rosEsc(n[4])}</td><td><span class="b ${SB[n[5]] || "mu"}">${rosEsc(n[5])}</span></td></tr>`).join(""), "rt")
      : em("No sales recorded yet", "Create your first bill in the Billing module to see transactions here.", `<button class="btn p" onclick="go('billing')">${i("plus")}New Bill</button>`)
  )}`;
};

window.fl2 = v => document.querySelectorAll("#rt tr").forEach(r => {
  r.hidden = v !== "All" && !r.textContent.includes(v);
});
window.sc = t => {
  S.ch = t[0].toLowerCase();
  route(1);
};

// ============================================================================
// 2. PRODUCTS MODULE
// ============================================================================
const pl = () => {
  let r = PR.map((p, j) => [p, j]).filter(([p]) =>
    (p[0].toLowerCase().includes(S.q.toLowerCase()) || p[1].toLowerCase().includes(S.q.toLowerCase())) &&
    (S.cat == "All" || p[2] == S.cat) &&
    (S.stf == "All" || ST(p)[0] == S.stf)
  );
  return r.sort((a, b) => S.so == "p" ? b[0][4] - a[0][4] : S.so == "s" ? a[0][5] - b[0][5] : a[0][0].localeCompare(b[0][0]));
};

window.pt = () => {
  const r = pl(), pgs = Math.max(1, Math.ceil(r.length / 8));
  S.pg = Math.min(S.pg, pgs);
  const s = r.slice((S.pg - 1) * 8, S.pg * 8);
  const ptb = $("#ptb");
  if (!ptb) return;

  if (!PR.length) {
    ptb.innerHTML = em(
      "No products in your catalogue yet",
      "Add your first product with purchase price, selling price, GST rate and opening stock.",
      `<button class="btn p" onclick="pf(-1)">${i("plus")}Add Product</button>`
    );
    return;
  }

  ptb.innerHTML = r.length
    ? tb(
        ["Product", "SKU", "Category", "Purchase", "Selling", "Stock", "GST", "Status", ""],
        s.map(([p, j]) => `<tr><td><div class="row"><span class="av">${rosEsc(p[2]).slice(0, 2).toUpperCase()}</span><b>${rosEsc(p[0])}</b></div></td><td>${rosEsc(p[1])}</td><td>${rosEsc(p[2])}</td><td class="r">${R(p[3])}</td><td class="r">${R(p[4])}</td><td class="r">${p[5]}</td><td class="r">${p[7]}%</td><td><span class="b ${ST(p)[1]}">${ST(p)[0]}</span></td><td class="r"><button class="ib" style="display:inline-grid" title="View" onclick="pd(${j})">${i("eye")}</button><button class="ib" style="display:inline-grid" title="Edit" onclick="pf(${j})">${i("edit")}</button><button class="ib" style="display:inline-grid" title="Delete" onclick="px(${j})">${i("trash")}</button></td></tr>`).join("")
      ) + `<div class="row sb sub" style="padding:12px"><span>Showing ${(S.pg - 1) * 8 + 1}–${(S.pg - 1) * 8 + s.length} of ${r.length} products</span><span class="row">${[...Array(pgs)].map((_, k) => `<button class="btn s ${k + 1 == S.pg ? "p" : ""}" onclick="S.pg=${k + 1};pt()">${k + 1}</button>`).join("")}</span></div>`
    : em("No products match your filters", "Try a different search or clear the filters.", `<button class="btn" onclick="S.q='';S.cat='All';S.stf='All';route(1)">Clear filters</button>`);
};

V.products = () =>
  ph("Products", "Manage your catalogue, prices, GST rates and stock status.") +
  sm([
    ["Total Products", String(PR.length)],
    ["Active Products", String(PR.length)],
    ["Low-Stock Products", String(PR.filter(p => p[5] > 0 && p[5] <= p[6]).length)],
    ["Out-of-Stock Products", String(PR.filter(p => p[5] === 0).length)]
  ]) +
  `<div class="card" style="padding:0"><div class="row wr" style="padding:14px"><input class="in" style="max-width:280px" placeholder="Search products or SKU" value="${rosEsc(S.q)}" oninput="S.q=this.value;S.pg=1;pt()"><select class="in" style="width:auto" onchange="S.cat=this.value;pt()">${op(["All", ...CATS], S.cat)}</select><select class="in" style="width:auto" onchange="S.stf=this.value;pt()">${op(["All", "In stock", "Low stock", "Out of stock"], S.stf)}</select><select class="in" style="width:auto" onchange="S.so=this.value;pt()"><option value="n">Sort: Name</option><option value="p">Sort: Price</option><option value="s">Sort: Stock</option></select></div><div id="ptb"></div></div>`;

window.pf = j => {
  const p = j < 0 ? ["", "", "Groceries", "", "", 0, 10, 5] : PR[j];
  const taxOptions = [...new Set([0, 5, 12, 18, 28, ...MX.taxes.map(t => Number(t.r))])].sort((a, b) => a - b);
  M(`<h2>${j < 0 ? "Add Product" : "Edit Product"}</h2>
    <label class="f">Product name<input class="in" id="f1" value="${rosEsc(p[0])}"><div class="err" id="e1"></div></label>
    <div class="fg">
      <label class="f">SKU<input class="in" id="fsku" value="${rosEsc(p[1])}" placeholder="Auto-generated if blank"></label>
      <label class="f">Category<select class="in" id="fcat">${op(CATS, p[2])}</select></label>
      <label class="f">Purchase price (${MXC.sym})<input class="in" id="f2" type="number" min="0" step="0.01" value="${p[3]}"></label>
      <label class="f">Selling price (${MXC.sym})<input class="in" id="f3" type="number" min="0" step="0.01" value="${p[4]}"><div class="err" id="e3"></div></label>
      <label class="f">${j < 0 ? "Opening stock" : "Current stock"}<input class="in" id="fstock" type="number" min="0" step="1" value="${p[5]}"></label>
      <label class="f">Minimum stock level<input class="in" id="fmin" type="number" min="0" step="1" value="${p[6] ?? 10}"></label>
      <label class="f">GST rate<select class="in" id="fgst">${taxOptions.map(r => `<option value="${r}" ${Number(p[7]) === r ? "selected" : ""}>${r}%</option>`).join("")}</select></label>
      <label class="f">HSN code (optional)<input class="in" id="fhsn" value="${rosEsc(p[9] || "")}"></label>
    </div>
    <div class="row" style="justify-content:flex-end"><button class="btn" onclick="X()">Cancel</button><button class="btn p" onclick="ps(${j})">Save Product</button></div>`);
};

window.ps = async j => {
  const name = $("#f1").value.trim();
  const sku = $("#fsku").value.trim();
  const category = $("#fcat").value;
  const purchasePrice = Number($("#f2").value);
  const sellingPrice = Number($("#f3").value);
  const openingStock = Number($("#fstock").value);
  const minStockLevel = Number($("#fmin").value);
  const gstRate = Number($("#fgst").value);
  const hsnCode = $("#fhsn") ? $("#fhsn").value.trim() : "";

  if (!name) {
    $("#e1").textContent = "Product name is required";
    return T("Product name is required", 1);
  }
  if ($("#f2").value === "" || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return T("Enter a valid purchase price", 1);
  }
  if ($("#f3").value === "" || !Number.isFinite(sellingPrice) || sellingPrice < purchasePrice) {
    $("#e3").textContent = "Selling price must be greater than or equal to purchase price";
    return T("Selling price cannot be less than purchase price", 1);
  }
  if (!Number.isInteger(openingStock) || openingStock < 0) {
    return T("Stock quantity must be a whole number (0 or greater)", 1);
  }

  try {
    const payload = {
      name,
      sku,
      category,
      purchasePrice,
      sellingPrice,
      openingStock,
      minStockLevel: Number.isInteger(minStockLevel) && minStockLevel >= 0 ? minStockLevel : 10,
      gstRate,
      hsnCode
    };
    const res = j < 0
      ? await MunnemAPI.createProduct(payload)
      : await MunnemAPI.updateProduct(PR[j][8], payload);
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || (j < 0 ? "Product added successfully" : "Product updated successfully"));
  } catch (err) {
    T(err.message, 1);
  }
};

window.pd = j => {
  const p = PR[j];
  if (!p) return;
  const margin = p[4] > 0 ? Math.round(((p[4] - p[3]) / p[4]) * 100) : 0;
  M(`<div class="row sb"><h2>${rosEsc(p[0])}</h2><button class="ib" onclick="X()">✕</button></div><span class="b ${ST(p)[1]}">${ST(p)[0]}</span><div class="fg mt">${[
    ["SKU", rosEsc(p[1])],
    ["Category", rosEsc(p[2])],
    ["Purchase price", R(p[3])],
    ["Selling price", R(p[4])],
    ["Gross margin", margin + "%"],
    ["GST rate", p[7] + "%"],
    ["In stock", p[5] + " units"],
    ["Minimum level", p[6] + " units"]
  ].map(([a, b]) => `<div style="margin-bottom:12px"><div class="sub">${a}</div><b>${b}</b></div>`).join("")}</div><div class="bar"><i style="width:${Math.min(100, p[5] / Math.max(1, p[6] * 3) * 100)}%;background:${SC(p)}"></i></div><div class="sub mt">Suggested reorder: ${RQ(p)} units</div>`);
};

window.px = j => {
  const p = PR[j];
  if (!p) return;
  M(`<h2>Delete product?</h2><p class="sub" style="margin-bottom:16px">“${rosEsc(p[0])}” will be removed from your catalogue. Existing invoice records are retained.</p><div class="row" style="justify-content:flex-end"><button class="btn" onclick="X()">Cancel</button><button class="btn p" onclick="deleteProduct(${j})">Delete</button></div>`);
};

window.deleteProduct = async j => {
  const p = PR[j];
  if (!p) return;
  try {
    const res = await MunnemAPI.deleteProduct(p[8]);
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Product deleted");
  } catch (err) {
    T(err.message, 1);
  }
};

// ============================================================================
// 3. INVENTORY & STOCK MOVEMENTS MODULE
// ============================================================================
window.it = t => {
  S.it = t;
  $("#itb").innerHTML = ib();
};

const ib = () => {
  const t = S.it;
  const L = PR.filter(p =>
    t == "Low Stock" ? ST(p)[1] == "wn" :
    t == "Out of Stock" ? p[5] == 0 :
    t == "Reorder" ? RQ(p) > 0 : 1
  );

  if (t == "Movements") {
    return tb(
      ["Date", "Product", "SKU", "Type", "Qty", "Balance", "Reference"],
      ROS.movements.map(m => `<tr><td>${new Date(m.at).toLocaleString("en-IN")}</td><td><b>${rosEsc(m.product)}</b></td><td>${rosEsc(m.sku)}</td><td><span class="b ${m.qty > 0 ? "ok" : "mu"}">${rosEsc(m.type)}</span></td><td class="r">${m.qty > 0 ? "+" : ""}${m.qty}</td><td class="r">${m.balance}</td><td>${rosEsc(m.reference)}</td></tr>`).join("") ||
      '<tr><td colspan="7" class="sub" style="text-align:center;padding:24px">No stock movements recorded yet.</td></tr>'
    );
  }

  if (t == "Reorder") {
    return L.length
      ? tb(
          ["Product", "Current", "Minimum", "Suggested", "Est. cost", ""],
          L.map(p => `<tr><td><b>${rosEsc(p[0])}</b></td><td class="r">${p[5]}</td><td class="r">${p[6]}</td><td class="r"><b>${RQ(p)}</b></td><td class="r">${R(RQ(p) * p[3])}</td><td><button class="btn s" onclick="rosAddToPurchaseList(${PR.indexOf(p)})">Add to list</button></td></tr>`).join("")
        )
      : `<div class="sub" style="padding:28px;text-align:center">No products currently require reordering.</div>`;
  }

  if (!L.length) {
    return `<div class="sub" style="padding:28px;text-align:center">${PR.length ? "No products match this stock filter." : "No products added yet."}</div>`;
  }

  return tb(
    ["Product", "SKU", "Quantity", "Min", "Level", "Status", "Reorder"],
    L.map(p => `<tr><td><b>${rosEsc(p[0])}</b></td><td>${rosEsc(p[1])}</td><td class="r">${p[5]}</td><td class="r">${p[6]}</td><td><div class="bar"><i style="width:${Math.min(100, p[5] / Math.max(1, p[6] * 3) * 100)}%;background:${SC(p)}"></i></div></td><td><span class="b ${ST(p)[1]}">${ST(p)[0]}</span></td><td class="r">${RQ(p) || "—"}</td></tr>`).join("")
  );
};

V.inventory = () =>
  ph("Inventory", "See what needs attention, record stock movements and plan reorders.") +
  sm([
    ["Total Inventory Value", R(inventoryValue()), "At purchase cost"],
    ["Total Products", String(PR.length)],
    ["Low-Stock Items", String(PR.filter(p => p[5] > 0 && p[5] <= p[6]).length), "Below minimum level"],
    ["Out-of-Stock Items", String(PR.filter(p => p[5] === 0).length), "Lost sales risk"]
  ]) +
  `<div class="card"><div class="row sb wr" style="margin-bottom:10px">${tabs(["All", "Low Stock", "Out of Stock", "Movements", "Reorder"], S.it, "it")}<div class="row"><button class="btn" onclick="sf('Stock In')">Stock In / Out</button><button class="btn" onclick="sf('Set exact quantity')">Adjust</button></div></div><div id="itb">${ib()}</div></div>`;

window.sf = (defaultType = "Stock In") => {
  if (!PR.length) return T("Add a product first before updating stock", 1);
  M(`<h2>Update Stock</h2>
    <label class="f">Product<select class="in" id="rosStockProduct">${PR.map((p, j) => `<option value="${j}">${rosEsc(p[0])} (${rosEsc(p[1])}) · current ${p[5]}</option>`).join("")}</select></label>
    <div class="fg">
      <label class="f">Action<select class="in" id="rosStockType">${["Stock In", "Stock Out", "Set exact quantity"].map(x => `<option ${x === defaultType ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      <label class="f">Quantity<input class="in" id="rosStockQty" type="number" min="0" step="1"><div class="err" id="se"></div></label>
    </div>
    <label class="f">Reason / supplier / reference<input class="in" id="rosStockReason" placeholder="e.g. Purchase from wholesaler"></label>
    <div class="row" style="justify-content:flex-end"><button class="btn" onclick="X()">Cancel</button><button class="btn p" onclick="rosStockSubmit()">Save adjustment</button></div>`);
};

window.rosStockSubmit = async () => {
  const j = Number($("#rosStockProduct").value);
  const q = Number($("#rosStockQty").value);
  const t = $("#rosStockType").value;
  const reason = $("#rosStockReason").value.trim();
  const pr = PR[j];
  if (!pr || !Number.isInteger(q) || q < 0 || (t !== "Set exact quantity" && q === 0)) {
    $("#rosStockQty").classList.add("bad");
    if ($("#se")) $("#se").textContent = "Enter a valid whole-number quantity";
    return T("Enter a valid whole-number quantity", 1);
  }
  try {
    const res = await MunnemAPI.adjustStock({
      productId: pr[8],
      type: t,
      quantity: q,
      reason
    });
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Stock updated and movement recorded");
  } catch (err) {
    T(err.message, 1);
  }
};

window.rosAddToPurchaseList = async idx => {
  const p = PR[idx];
  if (!p) return T("Product not found", 1);
  try {
    const res = await MunnemAPI.addToPurchaseList(p[8]);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || `${p[0]} added to purchase list`);
  } catch (err) {
    T(err.message, 1);
  }
};

window.rosRemovePurchaseItem = async sku => {
  try {
    const res = await MunnemAPI.removeFromPurchaseList(sku);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Purchase-list item removed");
  } catch (err) {
    T(err.message, 1);
  }
};

window.rosExportPurchaseList = () => {
  const rows = [
    ["SKU", "Product", "Quantity", "Unit purchase cost", "Estimated total"],
    ...ROS.purchaseList.map(x => [x.sku, x.name, x.qty, x.unitCost, rosMoney(x.qty * x.unitCost)])
  ];
  const csv = rows.map(r => r.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "MUNNEM-purchase-list.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  T("Purchase list exported");
};

// ============================================================================
// 4. BILLING / POS & INVOICES MODULE
// ============================================================================
function computeCartTotals(cart, discountInput, supplyType = "same") {
  let subCents = 0;
  const lines = cart.map(([j, q, itemType]) => {
    if (itemType === "service") {
      const srv = MX.services[j];
      const priceCents = Math.round(Number(srv?.price || 0) * 100);
      const lineSubCents = priceCents * q;
      subCents += lineSubCents;
      return { lineSubCents, gstRate: Number(srv?.tax || 0) };
    } else {
      const p = PR[j];
      const priceCents = Math.round(Number(p?.[4] || 0) * 100);
      const lineSubCents = priceCents * q;
      subCents += lineSubCents;
      return { lineSubCents, gstRate: Number(p?.[7] || 0) };
    }
  });

  const dscCents = Math.min(Math.max(0, Math.round((Number(discountInput) || 0) * 100)), subCents);
  let taxCents = 0;
  lines.forEach(l => {
    const share = subCents > 0 ? Math.round((dscCents * l.lineSubCents) / subCents) : 0;
    const taxable = Math.max(0, l.lineSubCents - share);
    taxCents += Math.round((taxable * l.gstRate) / 100);
  });

  const taxableCents = Math.max(0, subCents - dscCents);
  const totCents = taxableCents + taxCents;
  const sub = rosMoney(subCents / 100);
  const dsc = rosMoney(dscCents / 100);
  const taxable = rosMoney(taxableCents / 100);
  const gs = rosMoney(taxCents / 100);
  const cgst = supplyType === "same" ? rosMoney(gs / 2) : 0;
  const sgst = supplyType === "same" ? rosMoney(gs - cgst) : 0;
  const igst = supplyType === "other" ? gs : 0;
  const tot = rosMoney(totCents / 100);

  return { sub, dsc, taxable, gs, cgst, sgst, igst, tot };
}

window.bc = () => {
  const bp = $("#bp");
  if (!bp) return;
  const { sub, dsc, taxable, gs, cgst, sgst, igst, tot } = computeCartTotals(S.cart, S.ds, S.supplyType);
  const defaultRc = S.pay === "Credit" ? 0 : tot;
  const rc = S.rc === "" ? defaultRc : Math.max(0, Number(S.rc) || 0);
  const c = S.cu >= 0 ? CU[S.cu] : null;
  const custDue = c ? customerStats(c).outstanding : 0;

  bp.innerHTML = `<h3>Current bill</h3>
    <div class="row mt"><span class="av">${c ? rosEsc(c[0]).split(" ").map(x => x[0]).join("") : "WK"}</span><div><b>${c ? rosEsc(c[0]) : "Walk-in Customer"}</b><div class="sub">${c ? rosEsc(c[1] || "No phone") + " · Due " + R(custDue) : "Direct counter sale"}</div></div></div>
    <div class="row wr" style="margin-top:10px;font-size:12px">
      <span class="sub">Supply:</span>
      <span class="ch ${S.supplyType === "same" ? "on" : ""}" onclick="S.supplyType='same';bc()">Same state (CGST+SGST)</span>
      <span class="ch ${S.supplyType === "other" ? "on" : ""}" onclick="S.supplyType='other';bc()">Other state (IGST)</span>
    </div>
    <div style="margin:12px 0">${
      S.cart.length
        ? S.cart.map(([j, q, itemType], k) => {
            const name = itemType === "service" ? MX.services[j]?.name : PR[j]?.[0];
            const price = itemType === "service" ? MX.services[j]?.price : PR[j]?.[4];
            return `<div class="al"><div><b>${rosEsc(name)}</b><div class="sub">${R(price)} × ${q}</div></div><span class="qt"><button onclick="qc(${k},-1)">−</button><span style="min-width:22px;text-align:center">${q}</span><button onclick="qc(${k},1)">+</button></span><b class="r" style="width:75px">${R(price * q)}</b></div>`;
          }).join("")
        : em("Bill is empty", "Tap a product to add it.", "")
    }</div>
    <div class="tl"><span>Subtotal</span><span>${R(sub)}</span></div>
    <div class="tl"><span>Discount (${MXC.sym})</span><input class="in" id="billDiscountInput" type="number" min="0" step="0.01" style="width:95px;padding:4px 8px" value="${S.ds || ""}" onchange="S.ds=this.value;bc()"></div>
    <div class="tl"><span>Taxable value</span><span>${R(taxable)}</span></div>
    ${
      S.supplyType === "same"
        ? `<div class="tl"><span>CGST</span><span>${R(cgst)}</span></div><div class="tl"><span>SGST</span><span>${R(sgst)}</span></div>`
        : `<div class="tl"><span>IGST</span><span>${R(igst)}</span></div>`
    }
    <div class="tl t"><span>Total</span><span>${R(tot)}</span></div>
    <div class="row wr" style="margin:12px 0">${["Cash", "UPI", "Card", "Credit"].map(x => `<span class="ch ${S.pay == x ? "on" : ""}" onclick="S.pay='${x}';S.rc='';bc()">${x}</span>`).join("")}</div>
    <div class="tl"><span>Amount received</span><input class="in" id="billReceivedInput" type="number" min="0" step="0.01" style="width:110px;padding:4px 8px" value="${S.rc === "" ? defaultRc : S.rc}" onchange="S.rc=this.value;bc()"></div>
    <div class="tl"><span>Outstanding balance</span><b class="${tot - rc > 0.01 ? "dn" : "up"}">${R(Math.max(tot - rc, 0))}</b></div>
    <div class="row wr mt"><button class="btn p" style="flex:1" ${S.savingBill ? "disabled" : ""} onclick="sv(0)">Save Invoice</button><button class="btn" ${S.savingBill ? "disabled" : ""} onclick="sv(1)">${i("print")}Save & Print</button></div>
    <button class="btn dg" style="width:100%;margin-top:8px;justify-content:center" onclick="S.cart=[];S.ds=0;S.rc='';bc();T('Bill cleared')">Cancel Bill</button>`;
};

window.qc = (k, d) => {
  const item = S.cart[k];
  if (!item) return;
  const [j, q, itemType] = item;
  const nextQty = q + d;
  if (itemType !== "service" && d > 0 && PR[j] && nextQty > PR[j][5]) {
    return T(`Only ${PR[j][5]} units of ${PR[j][0]} available in stock`, 1);
  }
  item[1] = nextQty;
  if (item[1] < 1) S.cart.splice(k, 1);
  bc();
};

window.ad = (j, itemType = "product") => {
  const e = S.cart.find(c => c[0] == j && (c[2] || "product") == itemType);
  if (itemType === "product") {
    const currentInCart = e ? e[1] : 0;
    if (!PR[j] || currentInCart + 1 > PR[j][5]) {
      return T(`Insufficient stock for ${PR[j]?.[0] || "product"}`, 1);
    }
  }
  if (e) e[1]++;
  else S.cart.push([j, 1, itemType]);
  bc();
};

window.sv = async printAfter => {
  if (S.savingBill) return;
  if (!S.cart.length) return T("Add at least one item first", 1);

  const selectedCustomer = S.cu >= 0 && CU[S.cu] ? CU[S.cu] : null;
  const { tot } = computeCartTotals(S.cart, S.ds, S.supplyType);
  const defaultRc = S.pay === "Credit" ? 0 : tot;
  const amountReceived = S.rc === "" ? defaultRc : Number(S.rc);

  const items = S.cart.map(([j, q, itemType]) => {
    if (itemType === "service") {
      return { itemType: "service", serviceId: MX.services[j].id, quantity: q };
    }
    return { itemType: "product", productId: PR[j][8], quantity: q };
  });

  S.savingBill = true;
  bc();
  try {
    const res = await MunnemAPI.createInvoice({
      customerId: selectedCustomer ? selectedCustomer[7] : null,
      customerName: selectedCustomer ? selectedCustomer[0] : "Walk-in Customer",
      supplyType: S.supplyType,
      discountAmount: Number(S.ds) || 0,
      paymentMethod: S.pay,
      amountReceived,
      items
    });
    applyWorkspace(res.workspace);
    S.iv = 0;
    S.cart = [];
    S.rc = "";
    S.ds = 0;
    S.cu = -1;
    T(res.message || "Invoice saved");
    if (printAfter) go("invoice");
    else route(1);
  } catch (err) {
    T(err.message, 1);
  } finally {
    S.savingBill = false;
    if ($("#bp")) bc();
  }
};

window.bg = () => {
  const bgEl = $("#bg");
  if (!bgEl) return;
  const prodCards = PR.map((p, j) => [p, j])
    .filter(([p]) =>
      (p[0].toLowerCase().includes(S.bq.toLowerCase()) || p[1].toLowerCase().includes(S.bq.toLowerCase())) &&
      (S.bc == "All" || p[2] == S.bc)
    )
    .map(([p, j]) => `<button class="pc" ${p[5] ? "" : "disabled"} onclick="ad(${j},'product')"><div class="sub">${rosEsc(p[2])} · ${rosEsc(p[1])}</div><b>${rosEsc(p[0])}</b><div class="row sb" style="margin-top:6px"><b style="color:var(--ac)">${R(p[4])}</b><span class="b ${ST(p)[1]}">${p[5] ? p[5] + " left" : "Out"}</span></div></button>`);

  const srvCards = (S.bc == "All" || S.bc == "Services")
    ? MX.services
        .map((s, j) => [s, j])
        .filter(([s]) => s.active && s.name.toLowerCase().includes(S.bq.toLowerCase()))
        .map(([s, j]) => `<button class="pc" onclick="ad(${j},'service')"><div class="sub">Service · ${rosEsc(s.unit)}</div><b>${rosEsc(s.name)}</b><div class="row sb" style="margin-top:6px"><b style="color:var(--ac)">${R(s.price)}</b><span class="b ok">Service</span></div></button>`)
    : [];

  const allCards = [...prodCards, ...srvCards];
  bgEl.innerHTML = allCards.length
    ? allCards.join("")
    : `<div class="sub" style="grid-column:1/-1;padding:30px;text-align:center">${PR.length ? "No matching products found." : "Your product catalogue is empty. Add products first to start billing."}</div>`;
};

V.billing = () =>
  ph("New Bill", "Search products, tap to add, collect payment.") +
  `<div class="bl"><div class="card"><div class="row wr"><select class="in" id="billCustomerSelect" style="flex:1" onchange="S.cu=+this.value;bc()"><option value="-1">Walk-in Customer</option>${CU.map((c, j) => `<option value="${j}" ${j == S.cu ? "selected" : ""}>${rosEsc(c[0])}${c[1] ? " (" + rosEsc(c[1]) + ")" : ""}</option>`).join("")}</select><input class="in" style="flex:1" placeholder="Search product or scan SKU" value="${rosEsc(S.bq)}" oninput="S.bq=this.value;bg()"></div><div class="row wr" style="margin:12px 0">${["All", ...CATS].map(c => `<span class="ch ${S.bc == c ? "on" : ""}" onclick="S.bc='${c}';route(1)">${c}</span>`).join("")}</div><div class="pg" id="bg"></div></div><div class="card bp" id="bp"></div></div>`;

window.ivt = f => {
  S.ivf = f;
  route(1);
};

V.invoices = () =>
  ph("Invoice History", "Invoices created from completed POS sales.") +
  sm(
    ["Paid", "Partial", "Unpaid"]
      .map(s => [
        s + " invoices",
        String(IN.filter(n => n[5] === s).length),
        R(IN.filter(n => n[5] === s).reduce((a, n) => a + Number(n[3] || 0), 0))
      ])
      .concat([["Total invoices", String(IN.length), R(IN.reduce((a, n) => a + Number(n[3] || 0), 0))]])
  ) +
  `<div class="card">${tabs(["All", "Paid", "Partial", "Unpaid"], S.ivf, "ivt")}<div style="margin-top:10px">${
    IN.filter(n => S.ivf === "All" || n[5] === S.ivf).length
      ? tb(
          ["Invoice", "Customer", "Date", "Amount", "Paid", "Balance", "Method", "Status"],
          IN.map((n, j) => ({ n, j }))
            .filter(x => S.ivf === "All" || x.n[5] === S.ivf)
            .map(({ n, j }) => `<tr class="ck" onclick="S.iv=${j};go('invoice')"><td><b>${rosEsc(n[0])}</b></td><td>${rosEsc(n[1])}</td><td>${rosEsc(n[2])}</td><td class="r">${R(n[3])}</td><td class="r">${R(n[6] || 0)}</td><td class="r ${rosOutstanding(n) > 0 ? "dn" : ""}">${R(rosOutstanding(n))}</td><td>${rosEsc(n[4])}</td><td><span class="b ${SB[n[5]] || "mu"}">${rosEsc(n[5])}</span></td></tr>`)
            .join("")
        )
      : em("No invoices yet", "Invoices appear here after you save a POS sale.", `<button class="btn p" onclick="go('billing')">${i("plus")}New Bill</button>`)
  }</div></div>`;

// ============================================================================
// 5. INVOICE PAPER, PRINTING, PDF & RECORD PAYMENT
// ============================================================================
const gcalc = (it, d) => {
  let subCents = 0;
  const lines = (it || []).map(line => {
    const qty = Number(line[1] || 0);
    const rate = Number(line[3] ?? PR[line[0]]?.[4] ?? 0);
    const gst = Number(line[4] ?? PR[line[0]]?.[7] ?? 0);
    const lineSubCents = Math.round(rate * 100) * qty;
    subCents += lineSubCents;
    return { lineSubCents, gst };
  });
  const dsCents = Math.min(Math.max(0, Math.round((Number(d) || 0) * 100)), subCents);
  const txCents = Math.max(0, subCents - dsCents);
  let taxCents = 0;
  lines.forEach(l => {
    const share = subCents > 0 ? Math.round((dsCents * l.lineSubCents) / subCents) : 0;
    const base = Math.max(0, l.lineSubCents - share);
    taxCents += Math.round((base * l.gst) / 100);
  });
  const sub = rosMoney(subCents / 100);
  const ds = rosMoney(dsCents / 100);
  const tx = rosMoney(txCents / 100);
  const tax = rosMoney(taxCents / 100);
  return { sub, ds, tx, tax, tot: rosMoney(tx + tax) };
};

const taxl = (c, tt) =>
  tt == "same"
    ? `<div class="tl"><span>CGST</span><span>${R(c.tax / 2)}</span></div><div class="tl"><span>SGST</span><span>${R(c.tax - rosMoney(c.tax / 2))}</span></div>`
    : `<div class="tl"><span>IGST</span><span>${R(c.tax)}</span></div>`;

const paper = (id, cust, date, it, tt, d, pm, paid) => {
  const c = gcalc(it, d);
  const pd = paid == null ? c.tot : Number(paid);
  const gstin = ROS.settings.gstin || MX.profile.gstin || "";
  const stateLabel = ROS.settings.state || "Same state";
  const addrParts = [ROS.settings.address, ROS.settings.city, ROS.settings.state, ROS.settings.pinCode].filter(Boolean).join(", ");
  return `<div class="pp">
    <div class="row sb wr">
      <div>
        <b style="font-size:18px">${rosEsc(ROS.settings.shopName || "My Retail Business")}</b>
        <div class="sub">
          ${addrParts ? rosEsc(addrParts) + "<br>" : ""}
          ${ROS.settings.phone ? "Phone: " + rosEsc(ROS.settings.phone) + "<br>" : ""}
          ${gstin ? "<b>GSTIN: " + rosEsc(gstin) + "</b>" : ""}
        </div>
      </div>
      <div style="text-align:right">
        <b>TAX INVOICE</b>
        <div class="sub"><span>Invoice no.:</span> <b>${rosEsc(id)}</b><br><span>Date:</span> ${rosEsc(date)}</div>
      </div>
    </div>
    <hr style="border:0;border-top:1px solid #d5dbe3;margin:12px 0">
    <div class="sub">Bill to</div>
    <b>${rosEsc(cust)}</b>
    <div class="sub">${tt == "same" ? `Intra-state supply (${rosEsc(stateLabel)})` : "Inter-state supply (IGST)"}</div>
    <div class="tw" style="margin-top:10px">
      <table>
        <thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">GST %</th><th class="r">Amount</th></tr></thead>
        <tbody>${(it || []).map((line, k) => {
          const name = line[2] || PR[line[0]]?.[0] || "Item";
          const qty = Number(line[1] || 0);
          const rate = Number(line[3] ?? PR[line[0]]?.[4] ?? 0);
          const gst = Number(line[4] ?? PR[line[0]]?.[7] ?? 0);
          return `<tr><td>${k + 1}</td><td>${rosEsc(name)}</td><td class="r">${qty}</td><td class="r">${R(rate)}</td><td class="r">${gst}%</td><td class="r">${R(rate * qty)}</td></tr>`;
        }).join("")}</tbody>
      </table>
    </div>
    <div style="max-width:290px;margin:12px 0 0 auto">
      <div class="tl"><span>Subtotal</span><span>${R(c.sub)}</span></div>
      ${c.ds ? `<div class="tl"><span>Discount</span><span>−${R(c.ds)}</span></div>` : ""}
      <div class="tl"><span>Taxable value</span><span>${R(c.tx)}</span></div>
      ${taxl(c, tt)}
      <div class="tl t"><span>Grand total</span><span>${R(c.tot)}</span></div>
      <div class="tl"><span>Payment method</span><span>${rosEsc(pm)}</span></div>
      <div class="tl"><span>Amount received</span><span>${R(pd)}</span></div>
      <div class="tl"><span>Balance due</span><b>${R(Math.max(c.tot - pd, 0))}</b></div>
    </div>
    <div class="sub" style="text-align:right;margin-top:26px">For ${rosEsc(ROS.settings.shopName || "Business")}<br><br>Authorised Signatory</div>
  </div>`;
};

window.openInvoicePaymentModal = idx => {
  const n = IN[idx];
  if (!n) return;
  const due = rosOutstanding(n);
  if (due <= 0) return T("This invoice is already fully paid");
  M(`<h2>Record Payment · ${rosEsc(n[0])}</h2>
    <div class="sub" style="margin-bottom:12px">Customer: <b>${rosEsc(n[1])}</b> · Outstanding balance: <b>${R(due)}</b></div>
    <div class="fg">
      <label class="f">Amount (${MXC.sym})<input class="in" id="invPayAmt" type="number" min="0.01" max="${due}" step="0.01" value="${due}"></label>
      <label class="f">Payment method<select class="in" id="invPayMethod"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank transfer</option></select></label>
    </div>
    <label class="f">Reference / note<input class="in" id="invPayRef" placeholder="UPI txn ID or receipt note"></label>
    ${mxBtns(`submitInvoicePayment(${idx})`, "Save Payment")}`);
};

window.submitInvoicePayment = async idx => {
  const n = IN[idx];
  if (!n) return;
  const amount = Number($("#invPayAmt").value);
  const method = $("#invPayMethod").value;
  const ref = $("#invPayRef").value.trim();
  await rosRecordPayment(idx, amount, method, ref);
  X();
};

V.invoice = () => {
  const n = IN[S.iv];
  if (!n) {
    return `<div class="card"><h2>Invoice not found</h2><button class="btn mt" onclick="go('invoices')">Back to invoices</button></div>`;
  }
  const due = rosOutstanding(n);
  return `<div class="row np wr" style="margin-bottom:14px">
      <button class="btn" onclick="go('invoices')">${i("left")}Back</button>
      <button class="btn p" onclick="print()">${i("print")}Print invoice</button>
      <button class="btn" onclick="mxPdf()">${i("dl")}Download PDF</button>
      ${due > 0 ? `<button class="btn p" onclick="openInvoicePaymentModal(${S.iv})">Record payment (${R(due)})</button>` : ""}
      <span class="b ${SB[n[5]]}">${rosEsc(n[5])}</span>
    </div>
    <div class="lt">${paper(n[0], n[1], n[2], IT[S.iv] || [], n[11] || "same", n[8] || 0, n[4], n[6] || 0)}</div>
    <div class="card np mt">
      <div class="row sb"><h3>Payment history</h3>${due > 0 ? `<button class="btn s p" onclick="openInvoicePaymentModal(${S.iv})">Record payment</button>` : ""}</div>
      <div style="margin-top:8px">${
        ROS.payments
          .filter(x => x.invoice === n[0])
          .map(x => `<div class="tl"><span>${new Date(x.at).toLocaleString("en-IN")} · ${rosEsc(x.method)}${x.ref ? " · " + rosEsc(x.ref) : ""}</span><b>${mxM(x.amount)}</b></div>`)
          .join("") || '<div class="sub">No payments recorded for this invoice yet.</div>'
      }</div>
    </div>`;
};

// ============================================================================
// 6. CUSTOMERS MODULE
// ============================================================================
const customerStats = c => {
  if (!c) return { invoices: [], orders: 0, purchases: 0, outstanding: 0 };
  const ci = CU.indexOf(c);
  const invoices = IN.filter(n => n[9] === ci || (n[9] == null && n[1] === c[0]));
  const orders = invoices.length;
  const purchases = rosMoney(invoices.reduce((a, n) => a + Number(n[3] || 0), 0));
  const outstanding = rosMoney(invoices.reduce((a, n) => a + rosOutstanding(n), 0));
  return { invoices, orders, purchases, outstanding };
};

V.customers = () => {
  const stats = CU.map(customerStats);
  const due = stats.filter(x => x.outstanding > 0);
  return (
    ph("Customers", "Manage customer details, purchase history and outstanding balances.") +
    sm([
      ["Total Customers", String(CU.length), "Saved customer records"],
      ["Active Customers", String(stats.filter(x => x.orders > 0).length), "Customers with at least one invoice"],
      ["With Outstanding", String(due.length), "Customers with unpaid balances"],
      ["Outstanding Balance", R(due.reduce((a, x) => a + x.outstanding, 0)), "Calculated from saved invoices"]
    ]) +
    cd(
      "Customer directory",
      "",
      CU.length
        ? `<input class="in" id="cq" style="max-width:280px;margin-bottom:10px" placeholder="Search customers" oninput="fl('#cq','#ctb')">` +
          tb(
            ["Customer", "Phone", "City", "Orders", "Total purchases", "Outstanding", "Status"],
            CU.map((c, j) => {
              const x = customerStats(c);
              return `<tr class="ck" onclick="S.pcu=${j};go('customer')"><td><div class="row"><span class="av">${rosEsc(c[0]).split(" ").map(w => w[0]).join("")}</span><b>${rosEsc(c[0])}</b></div></td><td>${rosEsc(c[1] || "—")}</td><td>${rosEsc(c[5] || "—")}</td><td class="r">${x.orders}</td><td class="r">${R(x.purchases)}</td><td class="r ${x.outstanding ? "dn" : ""}">${R(x.outstanding)}</td><td><span class="b ${x.outstanding ? "wn" : "ok"}">${x.outstanding ? "Payment due" : "No dues"}</span></td></tr>`;
            }).join(""),
            "ctb"
          )
        : em("No customers added yet", "Add your customers to track their bills, credit limits and outstanding balances.", `<button class="btn p" onclick="cf()">${i("plus")}Add Customer</button>`)
    )
  );
};

V.customer = () => {
  const c = CU[S.pcu];
  if (!c) return `<div class="card"><h2>Customer not found</h2><button class="btn mt" onclick="go('customers')">Back to customers</button></div>`;
  const x = customerStats(c);
  const invSet = new Set(x.invoices.map(n => n[0]));
  const payments = ROS.payments.filter(p => invSet.has(p.invoice));
  const initials = rosEsc(c[0]).split(" ").map(v => v[0]).join("");
  return `<button class="btn np" onclick="go('customers')" style="margin-bottom:14px">${i("left")}Customers</button>
    <div class="card row sb wr" style="margin-bottom:16px">
      <div class="row"><span class="av" style="width:52px;height:52px;font-size:17px">${initials}</span><div><h1>${rosEsc(c[0])}</h1><div class="sub">${rosEsc(c[1] || "No phone")} · ${rosEsc(c[5] || "City not set")}${c[10] ? " · GSTIN: " + rosEsc(c[10]) : ""}</div></div></div>
      <div class="row"><button class="btn" onclick="cf(1)">Edit</button><button class="btn p" onclick="S.cu=S.pcu;go('billing')">New bill</button></div>
    </div>
    <div class="g g3">${[
      ["Total purchases", R(x.purchases)],
      ["Orders", x.orders],
      ["Outstanding balance", R(x.outstanding)]
    ].map(([l, v]) => `<div class="card k"><div class="l">${l}</div><div class="n">${v}</div></div>`).join("")}</div>
    <div class="card" style="margin-bottom:16px"><div class="row sb wr"><h3>Credit limit</h3><b>${R(Number(c[6] || 0))}</b></div><div class="sub">${Number(c[6] || 0) > 0 ? `Available credit: ${R(Math.max(0, Number(c[6]) - x.outstanding))}` : "No credit limit set"}</div></div>
    <div class="card">${tabs(["Purchases", "Payments"], S.ct, "ctt")}<div style="margin-top:10px">${
      S.ct == "Purchases"
        ? tb(
            ["Invoice", "Date", "Amount", "Paid", "Balance", "Method", "Status"],
            x.invoices.map(n => `<tr class="ck" onclick="S.iv=${IN.indexOf(n)};go('invoice')"><td><b>${rosEsc(n[0])}</b></td><td>${rosEsc(n[2])}</td><td class="r">${R(n[3])}</td><td class="r">${R(n[6] || 0)}</td><td class="r">${R(rosOutstanding(n))}</td><td>${rosEsc(n[4])}</td><td><span class="b ${SB[n[5]] || "mu"}">${rosEsc(n[5])}</span></td></tr>`).join("") ||
            '<tr><td colspan="7" class="sub" style="text-align:center;padding:20px">No purchases recorded for this customer.</td></tr>'
          )
        : tb(
            ["Date", "Invoice", "Amount", "Method", "Reference"],
            payments.map(p => `<tr><td>${new Date(p.at).toLocaleString("en-IN")}</td><td>${rosEsc(p.invoice)}</td><td class="r">${R(p.amount)}</td><td>${rosEsc(p.method)}</td><td>${rosEsc(p.ref || "—")}</td></tr>`).join("") ||
            '<tr><td colspan="5" class="sub" style="text-align:center;padding:20px">No payments recorded for this customer.</td></tr>'
          )
    }</div></div>`;
};

window.ctt = t => {
  S.ct = t;
  route(1);
};

window.cf = e => {
  const editing = !!e, old = editing ? CU[S.pcu] : null;
  if (editing && !old) return T("Customer record not found", 1);
  M(`<h2>${editing ? "Edit Customer" : "Add Customer"}</h2>
    <div class="fg">
      <label class="f">Full name<input class="in" id="cn" maxlength="100" value="${rosEsc(old?.[0] || "")}"><div class="err" id="ce"></div></label>
      <label class="f">Phone<input class="in" id="cphone" maxlength="20" value="${rosEsc(old?.[1] || "")}" placeholder="+91"></label>
      <label class="f">City<input class="in" id="ccity" maxlength="80" value="${rosEsc(old?.[5] || "")}" placeholder="City"></label>
      <label class="f">Credit limit (${MXC.sym})<input class="in" id="climit" type="number" min="0" step="0.01" value="${Number(old?.[6] || 0)}"></label>
      <label class="f">Email (optional)<input class="in" id="cemail" type="email" value="${rosEsc(old?.[8] || "")}"></label>
      <label class="f">GSTIN (optional)<input class="in" id="cgstin" maxlength="15" value="${rosEsc(old?.[10] || "")}"></label>
    </div>
    <div class="row" style="justify-content:flex-end"><button class="btn" onclick="X()">Cancel</button><button class="btn p" onclick="saveCustomer(${editing ? S.pcu : -1})">Save Customer</button></div>`);
  setTimeout(() => $("#cn")?.focus(), 0);
};

window.saveCustomer = async index => {
  const name = $("#cn").value.trim();
  const phone = $("#cphone").value.trim();
  const city = $("#ccity").value.trim();
  const creditLimit = Number($("#climit").value || 0);
  const email = $("#cemail") ? $("#cemail").value.trim() : "";
  const gstin = $("#cgstin") ? $("#cgstin").value.trim().toUpperCase() : "";
  const err = $("#ce");

  if (!name) {
    err.textContent = "Customer name is required";
    $("#cn").classList.add("bad");
    return;
  }
  if (!Number.isFinite(creditLimit) || creditLimit < 0) {
    err.textContent = "Credit limit must be zero or greater";
    $("#climit").classList.add("bad");
    return;
  }

  try {
    const payload = { name, phone, city, creditLimit, email, gstin };
    const res = index >= 0
      ? await MunnemAPI.updateCustomer(CU[index][7], payload)
      : await MunnemAPI.createCustomer(payload);
    applyWorkspace(res.workspace);
    S.pcu = index >= 0 ? index : CU.length - 1;
    X();
    route(1);
    T(res.message || (index >= 0 ? "Customer updated successfully" : "Customer added successfully"));
  } catch (e) {
    if (err) err.textContent = e.message;
    T(e.message, 1);
  }
};

// ============================================================================
// 7. REPORTS & ANALYTICS MODULE
// ============================================================================
window.rp = t => {
  S.rt = t;
  route(1);
};

V.reports = () => {
  const t = S.rt;
  const q = (a, b) => `<div class="card"><h3>${a}</h3><div class="sub" style="margin-bottom:10px">${b}</div>`;
  let h = "";
  const now = new Date();
  const dayAgo = n => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };
  const salesTotal = rosMoney(IN.reduce((a, n) => a + Number(n[3] || 0), 0));
  const moneyReceived = rosMoney(IN.reduce((a, n) => a + Number(n[6] || 0), 0));
  const pendingTotal = rosMoney(IN.reduce((a, n) => a + rosOutstanding(n), 0));

  const units = {}, categoryRevenue = {}, productLast21 = {}, methodTotals = { UPI: 0, Cash: 0, Card: 0, Credit: 0 };
  let grossProfit = 0;

  IN.forEach((n, ix) => {
    const items = IT[ix] || [];
    items.forEach(line => {
      const pi = line[0];
      const qty = Number(line[1] || 0);
      const name = line[2] || PR[pi]?.[0] || "Product";
      const cat = line[7] || PR[pi]?.[2] || "Groceries";
      const price = Number(line[3] ?? PR[pi]?.[4] ?? 0);
      const cost = Number(line[5] ?? PR[pi]?.[3] ?? 0);
      units[name] = (units[name] || 0) + qty;
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + price * qty;
      grossProfit += (price - cost) * qty;
      if (pi >= 0 && new Date(n[7] || n[2]) >= dayAgo(21)) {
        productLast21[pi] = (productLast21[pi] || 0) + qty;
      }
    });
  });

  ROS.payments.forEach(p => {
    const k = methodTotals[p.method] !== undefined ? p.method : "Credit";
    methodTotals[k] += Number(p.amount || 0);
  });

  if (t == "Sales") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRows = IN.filter(n => new Date(n[7] || n[2]) >= monthStart);
    const monthTotal = rosMoney(monthRows.reduce((a, n) => a + Number(n[3] || 0), 0));
    const monthOrders = monthRows.length;
    h = sm([
      ["This month’s sales", R(monthTotal), "From saved invoices"],
      ["Monthly orders", String(monthOrders), "Bills recorded this month"],
      ["Average order", R(monthOrders ? monthTotal / monthOrders : 0)],
      ["Today’s sales", R(todaySales())]
    ]) + `<div class="g g21">${q("Which days earn the most?", "Actual saved invoices · current vs previous week")}${area(D.d)}</div>${q("Is the business growing?", "Actual monthly revenue · current vs previous three-month period")}${area(D.m)}</div></div>`;
  }

  if (t == "Products") {
    const best = Object.entries(units)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => `<tr><td>${rosEsc(name)}</td><td class="r">${qty}</td></tr>`)
      .join("");
    const slow = PR.map((p, j) => ({ p, j, qty: productLast21[j] || 0 }))
      .filter(x => x.qty === 0)
      .sort((a, b) => b.p[5] * b.p[3] - a.p[5] * a.p[3])
      .slice(0, 5)
      .map(x => `<tr><td>${rosEsc(x.p[0])}</td><td class="r">${x.p[5]}</td><td class="r">${R(x.p[5] * x.p[3])}</td></tr>`)
      .join("");
    const cats = ["Groceries", "Packaged Food", "Beverages", "Stationery", "Household"];
    const vals = cats.map(c => categoryRevenue[c] || 0);
    h = `<div class="g g2">${q("What sells best?", "Units sold across saved invoices")}${tb(["Product", "Units"], best || '<tr><td colspan="2" class="sub" style="text-align:center">No sales recorded yet</td></tr>')}</div>${q("What is slow-moving?", "No sales in the last 21 days")}${tb(["Product", "Stock", "Stock value"], slow || '<tr><td colspan="3" class="sub" style="text-align:center">No slow-moving products identified.</td></tr>')}</div></div>${q("Which category performs best?", "Revenue share from invoice items")}${dn(vals, cats)}</div>`;
  }

  if (t == "Financial") {
    const outstanding = IN.filter(n => rosOutstanding(n) > 0);
    const age = [0, 0, 0, 0];
    outstanding.forEach(n => {
      const days = Math.max(0, Math.floor((now - new Date(n[7] || n[2])) / 86400000));
      age[days <= 15 ? 0 : days <= 30 ? 1 : days <= 45 ? 2 : 3] += rosOutstanding(n);
    });
    h = sm([
      ["Total sales", R(salesTotal), "All saved invoices"],
      ["Money received", R(moneyReceived), "Recorded invoice collections"],
      ["Pending amount", R(pendingTotal), "Unpaid invoice balances"],
      ["Est. gross profit", R(grossProfit), "Line-item selling price less cost"]
    ]) + `<div class="g g2">${q("How do customers pay?", "Recorded payment ledger")}${dn(Object.values(methodTotals), Object.keys(methodTotals))}</div>${q("How old are dues?", "Outstanding invoice balances by age")}${bars(age, ["0–15d", "16–30d", "31–45d", "45d+"])}</div></div>`;
  }

  if (t == "Inventory") {
    const cats = ["Groceries", "Packaged Food", "Beverages", "Stationery", "Household"];
    const values = cats.map(c => PR.filter(p => p[2] === c).reduce((a, p) => a + p[3] * p[5], 0));
    const weeks = [0, 0, 0, 0];
    ROS.movements.forEach(m => {
      if (m.qty < 0) {
        const age = Math.floor((now - new Date(m.at)) / 604800000);
        if (age >= 0 && age < 4) weeks[3 - age] += Math.abs(m.qty);
      }
    });
    h = `<div class="g g2">${q("Where is money locked?", "Current stock valuation at purchase cost")}${bars(values, cats.map(c => c.slice(0, 5)))}</div>${q("Is stock moving in or out?", "Units sold per week · recent stock ledger")}${bars(weeks, ["W1", "W2", "W3", "W4"], "#6B8FD6")}</div></div>`;
  }

  return ph("Reports & Analytics", "Every chart answers one business question.", `<button class="btn" onclick="rosReportCSV()">${i("dl")}Export CSV</button><button class="btn" onclick="print()">${i("print")}Print / Save PDF</button>`) + `<div style="margin-bottom:16px">${tabs(["Sales", "Products", "Financial", "Inventory"], t, "rp")}</div>` + h;
};

window.rosReportCSV = () => {
  const headers = ["Invoice", "Customer", "Date", "Amount", "Method", "Status", "Amount received", "Outstanding"];
  const rows = IN.map(n => [n[0], n[1], n[2], n[3], n[4], n[5], Number(n[6] || 0), rosOutstanding(n)]);
  const csv = [headers, ...rows].map(row => row.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "MUNNEM-invoice-report-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  T("Invoice report exported as CSV");
};

// ============================================================================
// 8. GST CENTRE MODULE (Summary + Live GST Invoice Builder)
// ============================================================================
const G = { cu: -1, tt: "same", it: [], ds: 0, pay: "Cash", rc: "", pi: 0, pq: 1 };
window.gtab = t => {
  S.gtab = t;
  route(1);
};
window.gu = () => {
  const gx = $("#gx");
  if (gx) gx.innerHTML = gv();
};
window.ga = () => {
  if (!PR.length) return T("Add products first", 1);
  const p = PR[G.pi];
  if (!p) return;
  const e = G.it.find(c => c[0] == G.pi);
  const nextQty = (e ? e[1] : 0) + G.pq;
  if (nextQty > p[5]) return T(`Only ${p[5]} units of ${p[0]} available in stock`, 1);
  if (e) e[1] += G.pq;
  else G.it.push([G.pi, G.pq]);
  G.pq = 1;
  gu();
};
window.gs = async () => {
  if (!G.it.length) return T("Add at least one item first", 1);
  const c = gcalc(G.it, G.ds);
  const rc = G.rc === "" ? (G.pay === "Credit" ? 0 : c.tot) : Number(G.rc);
  const cust = G.cu >= 0 && CU[G.cu] ? CU[G.cu] : null;
  try {
    const res = await MunnemAPI.createInvoice({
      customerId: cust ? cust[7] : null,
      customerName: cust ? cust[0] : "Walk-in Customer",
      supplyType: G.tt,
      discountAmount: Number(G.ds) || 0,
      paymentMethod: G.pay,
      amountReceived: rc,
      items: G.it.map(([j, q]) => ({ itemType: "product", productId: PR[j][8], quantity: q }))
    });
    applyWorkspace(res.workspace);
    G.it = [];
    G.ds = 0;
    G.rc = "";
    T(res.message || "GST Invoice saved");
    S.iv = 0;
    go("invoice");
  } catch (err) {
    T(err.message, 1);
  }
};

const gv = () => {
  const c = gcalc(G.it, G.ds);
  const rc = G.rc === "" ? (G.pay === "Credit" ? 0 : c.tot) : Number(G.rc);
  const cu = G.cu >= 0 && CU[G.cu] ? CU[G.cu][0] : "Walk-in Customer";
  const nextInvNo = `${ROS.settings.prefix || "INV"}-${new Date().getFullYear()}-${String(ROS.nextInvoice || 1).padStart(5, "0")}`;
  return `<div class="gp"><div class="card"><h3>GST Bill Builder</h3><div class="fg mt"><label class="f">Customer<select class="in" onchange="G.cu=+this.value;gu()"><option value="-1">Walk-in Customer</option>${CU.map((c, j) => `<option value="${j}" ${j == G.cu ? "selected" : ""}>${rosEsc(c[0])}</option>`).join("")}</select></label><label class="f">Next invoice number<input class="in" value="${rosEsc(nextInvNo)}" readonly></label></div><div style="font-size:12px;font-weight:600;color:var(--t2)">Place of supply</div><div class="rd">${[["same", `Same state (${ROS.settings.state || "CGST + SGST"})`], ["other", "Other state (IGST)"]].map(([v, l]) => `<label><input type="radio" name="tt" ${G.tt == v ? "checked" : ""} onchange="G.tt='${v}';gu()">${rosEsc(l)}</label>`).join("")}</div>
    <div class="row" style="align-items:flex-end"><label class="f" style="flex:1;margin:0">Product<select class="in" onchange="G.pi=+this.value">${PR.length ? PR.map((p, j) => `<option value="${j}" ${j == G.pi ? "selected" : ""}>${rosEsc(p[0])} — ${R(p[4])} (${p[7]}% GST · ${p[5]} in stock)</option>`).join("") : `<option value="-1">No products available</option>`}</select></label><label class="f" style="width:76px;margin:0">Qty<input class="in" type="number" min="1" value="${G.pq}" onchange="G.pq=Math.max(1,+this.value||1)"></label><button class="btn p" onclick="ga()">Add</button></div>
    <div style="margin:12px 0">${G.it.length ? tb(["Item", "Qty", "GST", "Amount", ""], G.it.map(([j, q], k) => `<tr><td>${rosEsc(PR[j][0])}</td><td class="r">${q}</td><td class="r">${PR[j][7]}%</td><td class="r">${R(PR[j][4] * q)}</td><td><button class="btn s dg" onclick="G.it.splice(${k},1);gu()">Remove</button></td></tr>`).join("")) : em("No items added", "Choose a product and tap Add.", "")}</div>
    <label class="f">Bill discount (${MXC.sym})<input class="in" type="number" min="0" step="0.01" value="${G.ds || ""}" placeholder="0" onchange="G.ds=this.value;gu()"></label>
    <div class="card" style="background:var(--hv)"><div class="tl"><span>Taxable value</span><span>${R(c.tx)}</span></div>${taxl(c, G.tt)}<div class="tl t"><span>Grand total</span><span>${R(c.tot)}</span></div></div>
    <div class="fg mt"><label class="f">Payment method<select class="in" onchange="G.pay=this.value;G.rc='';gu()">${op(["Cash", "UPI", "Card", "Credit"], G.pay)}</select></label><label class="f">Amount received (${MXC.sym})<input class="in" type="number" min="0" step="0.01" value="${rc}" onchange="G.rc=this.value;gu()"></label></div><div class="tl"><span>Balance to collect</span><b class="${c.tot - rc > 0.01 ? "dn" : "up"}">${R(Math.max(c.tot - rc, 0))}</b></div><div class="row mt"><button class="btn p" onclick="gs()">Save GST Invoice</button><button class="btn" onclick="G.it=[];G.ds=0;G.rc='';gu()">Clear</button></div></div>
    <div><div class="row sb" style="margin-bottom:10px"><h3>Live tax invoice preview</h3><button class="btn s" onclick="print()">${i("print")}Print</button></div><div class="lt">${paper(nextInvNo, cu, mxD(new Date()), G.it, G.tt, G.ds, G.pay, rc)}</div></div></div>`;
};

V.gst = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = IN.filter(n => new Date(n[7] || n[2]) >= start);
  const lines = month.flatMap(n => {
    const ix = IN.indexOf(n);
    const supplyType = n[11] || "same";
    const items = IT[ix] || [];
    const sub = items.reduce((a, line) => a + Number(line[3] ?? PR[line[0]]?.[4] ?? 0) * Number(line[1] || 0), 0);
    const discount = Math.min(Number(n[8] || 0), sub);
    return items.map(line => {
      const raw = Number(line[3] ?? PR[line[0]]?.[4] ?? 0) * Number(line[1] || 0);
      const share = sub ? (discount * raw) / sub : 0;
      const base = Math.max(0, raw - share);
      const rate = Number(line[4] ?? PR[line[0]]?.[7] ?? 0);
      const tax = (base * rate) / 100;
      return {
        base,
        rate,
        tax,
        cgst: supplyType === "same" ? tax / 2 : 0,
        sgst: supplyType === "same" ? tax / 2 : 0,
        igst: supplyType === "other" ? tax : 0
      };
    });
  });

  const base = rosMoney(lines.reduce((a, x) => a + x.base, 0));
  const tax = rosMoney(lines.reduce((a, x) => a + x.tax, 0));
  const cgstTotal = rosMoney(lines.reduce((a, x) => a + x.cgst, 0));
  const sgstTotal = rosMoney(lines.reduce((a, x) => a + x.sgst, 0));
  const igstTotal = rosMoney(lines.reduce((a, x) => a + x.igst, 0));

  return (
    ph("GST Centre", "GST totals, slab-wise tax breakup and paper-style GST invoice builder.", `<button class="btn p" onclick="go('billing')">Create POS invoice</button>`) +
    `<div style="margin-bottom:14px">${tabs(["Summary", "GST Invoice Builder"], S.gtab, "gtab")}</div>` +
    (S.gtab === "GST Invoice Builder"
      ? `<div id="gx">${gv()}</div>`
      : `<div class="card" style="margin-bottom:16px;background:var(--wnb);border-color:var(--wn)"><b>Compliance Note:</b> Figures below are calculated from your saved MySQL invoices and product GST rates${ROS.settings.gstin ? ` for GSTIN <b>${rosEsc(ROS.settings.gstin)}</b>` : ""}. Verify HSN/SAC and place of supply with your accountant before filing GSTR-1 / GSTR-3B.</div>
        <div class="g g4">${[
          ["Invoices this month", month.length],
          ["Taxable value", R(base)],
          ["Total GST collected", R(tax)],
          ["Gross invoice value", R(month.reduce((a, n) => a + Number(n[3] || 0), 0))]
        ].map(([l, v]) => `<div class="card k"><div class="l">${l}</div><div class="n">${v}</div></div>`).join("")}</div>
        <div class="g g3">${[
          ["CGST collected", R(cgstTotal)],
          ["SGST collected", R(sgstTotal)],
          ["IGST collected", R(igstTotal)]
        ].map(([l, v]) => `<div class="card k"><div class="l">${l}</div><div class="n">${v}</div></div>`).join("")}</div>
        <div class="card"><h3>Tax-rate breakdown (this month)</h3>${tb(
          ["GST rate", "Taxable amount", "CGST", "SGST", "IGST", "Total GST"],
          [...new Set(lines.map(x => x.rate))]
            .sort((a, b) => a - b)
            .map(rate => {
              const subset = lines.filter(x => x.rate === rate);
              const b = subset.reduce((a, x) => a + x.base, 0);
              const cg = subset.reduce((a, x) => a + x.cgst, 0);
              const sg = subset.reduce((a, x) => a + x.sgst, 0);
              const ig = subset.reduce((a, x) => a + x.igst, 0);
              const tx = subset.reduce((a, x) => a + x.tax, 0);
              return `<tr><td><b>${rate}%</b></td><td class="r">${R(b)}</td><td class="r">${R(cg)}</td><td class="r">${R(sg)}</td><td class="r">${R(ig)}</td><td class="r"><b>${R(tx)}</b></td></tr>`;
            })
            .join("") || '<tr><td colspan="6" class="sub" style="text-align:center;padding:20px">No invoice items recorded this month.</td></tr>'
        )}</div>`)
  );
};

// ============================================================================
// 9. BUSINESS HUB (Payments, Expenses, Ledgers, Reorder List, Data Export)
// ============================================================================
const rosRecordPayment = async (idx, amount, method, ref = "") => {
  const n = IN[idx];
  if (!n || !Number.isFinite(amount) || amount <= 0) return T("Enter a valid payment amount", 1);
  try {
    const res = await MunnemAPI.recordPayment({
      invoiceId: n[10],
      amount,
      paymentMethod: method,
      reference: ref
    });
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Payment recorded");
  } catch (err) {
    T(err.message, 1);
  }
};

V.business = () => {
  const due = rosMoney(IN.reduce((a, n) => a + rosOutstanding(n), 0));
  const received = rosMoney(ROS.payments.reduce((a, p) => a + p.amount, 0));
  const expense = rosMoney(ROS.expenses.reduce((a, e) => a + e.amount, 0));
  const money = n => mxM(n);
  const rows = (arr, cols, render) =>
    arr.length
      ? `<div class="tw"><table><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${arr.map(render).join("")}</tbody></table></div>`
      : `<div class="empty"><b>Nothing recorded yet</b><div class="sub">Records appear here as you operate your business.</div></div>`;
  const invOpts =
    IN.map((n, j) => ({ n, j }))
      .filter(x => rosOutstanding(x.n) > 0)
      .map(({ n, j }) => `<option value="${j}">${rosEsc(n[0])} · ${rosEsc(n[1])} · Due ${money(rosOutstanding(n))}</option>`)
      .join("") || `<option value="">No outstanding invoices</option>`;

  const purchaseHtml = `<div class="card"><div class="row sb wr"><div><h3>Purchase list</h3><div class="sub">Reorder suggestions saved from the Inventory tab.</div></div><button class="btn" onclick="rosExportPurchaseList()" ${ROS.purchaseList.length ? "" : "disabled"}>Export CSV</button></div>${rows(
    ROS.purchaseList,
    ["SKU", "Product", "Qty", "Unit cost", "Estimated total", ""],
    x => `<tr><td>${rosEsc(x.sku)}</td><td>${rosEsc(x.name)}</td><td class="r">${x.qty}</td><td class="r">${money(x.unitCost)}</td><td class="r">${money(x.qty * x.unitCost)}</td><td><button class="btn s dg" onclick="rosRemovePurchaseItem('${rosEsc(x.sku)}')">Remove</button></td></tr>`
  )}</div>`;

  return `<div class="ph"><div><h1>Business Hub</h1><div class="sub">Payments, expenses, stock movements and audit trail in one place.</div></div><button class="btn p" onclick="rosExport()">Export JSON snapshot</button></div>
    <div class="g g3">${[
      ["Outstanding", money(due), "Calculated from invoice balances"],
      ["Payments received", money(received), "Recorded collections"],
      ["Expenses recorded", money(expense), "Saved expense entries"]
    ].map(([l, v, s]) => `<div class="card k"><div class="l">${l}</div><div class="n">${v}</div><div class="sub">${s}</div></div>`).join("")}</div>
    <div class="g g2">
      <div class="card"><h3>Record customer payment</h3><div class="sub" style="margin-bottom:10px">Apply money to an unpaid or partially paid invoice.</div><label class="f">Invoice<select class="in" id="rosPayInv">${invOpts}</select></label><div class="fg"><label class="f">Amount (${MXC.sym})<input class="in" id="rosPayAmt" type="number" min="0.01" step="0.01"></label><label class="f">Method<select class="in" id="rosPayMethod"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank transfer</option></select></label></div><label class="f">Reference<input class="in" id="rosPayRef" placeholder="UPI reference / note"></label><button class="btn p" onclick="rosPaySubmit()">Save payment</button></div>
      <div class="card"><h3>Record expense</h3><div class="sub" style="margin-bottom:10px">Track rent, utilities, wages and shop expenses.</div><div class="fg"><label class="f">Expense title<input class="in" id="rosExpTitle" placeholder="e.g. Shop electricity"></label><label class="f">Amount (${MXC.sym})<input class="in" id="rosExpAmt" type="number" min="0.01" step="0.01"></label><label class="f">Category<select class="in" id="rosExpCat"><option>Rent</option><option>Utilities</option><option>Transport</option><option>Wages</option><option>Packaging</option><option>Other</option></select></label><label class="f">Date<input class="in" id="rosExpDate" type="date" value="${mxToday()}"></label></div><button class="btn p" onclick="rosExpenseSubmit()">Save expense</button></div>
    </div>
    <div class="card mt"><div class="row sb wr"><div><h3>Stock movement ledger</h3><div class="sub">Timestamped sales, purchases and manual adjustments.</div></div><button class="btn" onclick="sf()">Adjust stock</button></div>${rows(
      ROS.movements.slice(0, 100),
      ["Date", "Product", "Movement", "Qty", "Reference", "Balance"],
      m => `<tr><td>${new Date(m.at).toLocaleString("en-IN")}</td><td>${rosEsc(m.product)}</td><td>${rosEsc(m.type)}</td><td>${m.qty > 0 ? "+" : ""}${m.qty}</td><td>${rosEsc(m.reference)}</td><td>${m.balance}</td></tr>`
    )}</div>
    <div class="card mt"><h3>Payment ledger</h3>${rows(
      ROS.payments.slice(0, 100),
      ["Date", "Invoice", "Customer", "Method", "Amount", "Reference"],
      x => `<tr><td>${new Date(x.at).toLocaleString("en-IN")}</td><td>${rosEsc(x.invoice)}</td><td>${rosEsc(x.customer)}</td><td>${rosEsc(x.method)}</td><td>${money(x.amount)}</td><td>${rosEsc(x.ref)}</td></tr>`
    )}</div>
    <div class="card mt"><h3>Expense register</h3>${rows(
      ROS.expenses,
      ["Date", "Expense", "Category", "Amount", ""],
      x => `<tr><td>${rosEsc(x.date)}</td><td>${rosEsc(x.title)}</td><td>${rosEsc(x.category)}</td><td>${money(x.amount)}</td><td><button class="btn s dg" onclick="rosDeleteExpense(${x.id})">Delete</button></td></tr>`
    )}</div>
    <div class="mt">${purchaseHtml}</div>
    <div class="card mt"><h3>Recent activity</h3>${rows(
      ROS.audit.slice(0, 50),
      ["Time", "Action", "Details"],
      x => `<tr><td>${new Date(x.at).toLocaleString("en-IN")}</td><td>${rosEsc(x.action)}</td><td>${rosEsc(x.detail)}</td></tr>`
    )}</div>`;
};

window.rosPaySubmit = async () => {
  const selected = $("#rosPayInv").value;
  if (selected === "") return T("There are no outstanding invoices to pay", 1);
  const j = Number(selected);
  const amt = Number($("#rosPayAmt").value);
  await rosRecordPayment(j, amt, $("#rosPayMethod").value, $("#rosPayRef").value.trim());
};

window.rosExpenseSubmit = async () => {
  const title = $("#rosExpTitle").value.trim();
  const amount = Number($("#rosExpAmt").value);
  const date = $("#rosExpDate").value;
  const category = $("#rosExpCat").value;
  if (!title || !Number.isFinite(amount) || amount <= 0 || !date) {
    return T("Enter an expense name, valid amount and date", 1);
  }
  try {
    const res = await MunnemAPI.createExpense({ title, amount, date, category });
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Expense saved");
  } catch (err) {
    T(err.message, 1);
  }
};

window.rosDeleteExpense = async id => {
  try {
    const res = await MunnemAPI.deleteExpense(id);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Expense deleted");
  } catch (err) {
    T(err.message, 1);
  }
};

window.rosExport = async () => {
  try {
    const res = await MunnemAPI.getWorkspace();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: "MUNNEM Retail ERP", workspace: res.workspace }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "MUNNEM-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
    T("Workspace backup exported");
  } catch (err) {
    T(err.message, 1);
  }
};

// ============================================================================
// 10. PURCHASES & SUPPLIERS MODULE
// ============================================================================
const mxPoTot = p => rosMoney(p.lines.reduce((a, l) => a + l.qty * l.cost, 0));
const mxSupDue = id => rosMoney(MX.pos.filter(p => p.sup == id && p.status == "Received").reduce((a, p) => a + mxPoTot(p) - p.paid, 0));
const mxSup = id => (MX.suppliers.find(s => s.id == id) || { name: "(supplier)" }).name;

window.mxPu = t => {
  S.pu = t;
  route(1);
};

V.purchases = () => {
  const t = S.pu || "Purchase Orders";
  const pos = t == "Purchase Orders";
  return (
    ph("Purchases & Suppliers", "Manage suppliers and purchase orders. Receiving an order adds stock automatically in MySQL.", `<button class="btn p" onclick="${pos ? "mxPoForm()" : "mxSupForm(-1)"}">${pos ? "New purchase order" : "Add supplier"}</button>`) +
    tabs(["Purchase Orders", "Suppliers"], t, "mxPu") +
    (pos
      ? MX.pos.length
        ? mxTbl(
            ["PO", "Date", "Supplier", "Total", "Paid", "Balance", "Status", ""],
            MX.pos.map((p, i) => {
              const st = p.status;
              const tot = mxPoTot(p);
              const bal = Math.max(0, rosMoney(tot - p.paid));
              return `<tr><td><b>${rosEsc(p.id)}</b></td><td>${mxD(p.date)}</td><td>${rosEsc(p.supplierName || mxSup(p.sup))}</td><td>${mxM(tot)}</td><td>${mxM(p.paid)}</td><td>${mxM(bal)}</td><td><span class="b ${st == "Received" ? "ok" : st == "Cancelled" ? "er" : "wn"}">${st}</span></td><td>${st == "Draft" ? `<button class="btn s" onclick="mxPoAct(${i},'order')">Mark ordered</button> ` : ""}${st == "Draft" || st == "Ordered" ? `<button class="btn s p" onclick="mxPoAct(${i},'recv')">Receive</button> <button class="btn s dg" onclick="mxPoAct(${i},'cancel')">Cancel</button>` : ""}${st == "Received" && bal > 0 ? `<button class="btn s p" onclick="mxPayForm(${i})">Pay supplier</button>` : ""}</td></tr>`;
            })
          )
        : mxEmpty("No purchase orders yet", "Create an order for a supplier to restock products.", `<button class="btn p" onclick="mxPoForm()">New purchase order</button>`)
      : MX.suppliers.length
        ? mxTbl(
            ["Supplier", "Phone", "Email", "GSTIN", "Payable", ""],
            MX.suppliers.map((s, i) => `<tr><td><b>${rosEsc(s.name)}</b></td><td>${rosEsc(s.phone || "—")}</td><td>${rosEsc(s.email || "—")}</td><td>${rosEsc(s.gstin || "—")}</td><td>${mxM(mxSupDue(s.id))}</td><td><button class="btn s" onclick="mxSupForm(${i})">Edit</button> <button class="btn s dg" onclick="mxSupDel(${i})">Delete</button></td></tr>`)
          )
        : mxEmpty("No suppliers yet", "Add the suppliers you buy from.", `<button class="btn p" onclick="mxSupForm(-1)">Add supplier</button>`))
  );
};

window.mxSupForm = i => {
  const s = MX.suppliers[i] || {};
  M(`<h2>${i < 0 ? "Add" : "Edit"} supplier</h2>${mxIn("Supplier name", "s_n", s.name || "", "text", 'maxlength="120"')}<div class="fg">${mxIn("Phone", "s_p", s.phone || "")}${mxIn("Email", "s_m", s.email || "", "email")}</div>${mxIn("GSTIN (optional)", "s_g", s.gstin || "", "text", 'maxlength="15"')}${mxIn("Address", "s_a", s.address || "")}${mxBtns("mxSupSave(" + i + ")", "Save supplier")}`);
};

window.mxSupSave = async i => {
  const name = $("#s_n").value.trim();
  const phone = $("#s_p").value.trim();
  const email = $("#s_m").value.trim();
  const gstin = $("#s_g").value.trim().toUpperCase();
  const address = $("#s_a").value.trim();
  if (!name) return mxErr("Supplier name is required");
  try {
    const payload = { name, phone, email, gstin, address };
    const res = i < 0
      ? await MunnemAPI.createSupplier(payload)
      : await MunnemAPI.updateSupplier(MX.suppliers[i].id, payload);
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Supplier saved");
  } catch (err) {
    mxErr(err.message);
  }
};

window.mxSupDel = async i => {
  const s = MX.suppliers[i];
  if (!s) return;
  try {
    const res = await MunnemAPI.deleteSupplier(s.id);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Supplier deleted");
  } catch (err) {
    T(err.message, 1);
  }
};

let mxDr = [];
window.mxPoForm = () => {
  if (!MX.suppliers.length) return T("Add a supplier first", 1);
  if (!PR.length) return T("Add products first", 1);
  mxDr = [];
  M(`<h2>New purchase order</h2><div class="fg"><label class="f">Supplier<select class="in" id="po_s">${MX.suppliers.map(s => `<option value="${s.id}">${rosEsc(s.name)}</option>`).join("")}</select></label>${mxIn("Order date", "po_d", mxToday(), "date")}</div><div class="fg"><label class="f">Product<select class="in" id="po_p" onchange="$('#po_c').value=PR[this.value][3]">${PR.map((p, j) => `<option value="${j}">${rosEsc(p[0])}</option>`).join("")}</select></label>${mxIn("Quantity", "po_q", "1", "number", 'min="1" step="1"')}${mxIn("Unit cost", "po_c", PR[0][3], "number", 'min="0" step="0.01"')}</div><button class="btn" onclick="mxPoAdd()">Add line</button><div id="po_l" style="margin:12px 0"></div>${mxIn("Note (optional)", "po_n", "")}${mxBtns("mxPoSave()", "Save order")}`);
};

const mxPoLines = () => {
  $("#po_l").innerHTML = mxTbl(
    ["Product", "Qty", "Cost", "Total", ""],
    mxDr.map((l, k) => `<tr><td>${rosEsc(l.name)}</td><td>${l.qty}</td><td>${mxM(l.cost)}</td><td>${mxM(l.qty * l.cost)}</td><td><button class="btn s dg" onclick="mxDr.splice(${k},1);mxPoLines()">Remove</button></td></tr>`)
  );
};

window.mxPoAdd = () => {
  const j = +$("#po_p").value, q = +$("#po_q").value, c = +$("#po_c").value;
  if (!Number.isInteger(q) || q < 1 || !(c >= 0)) return mxErr("Enter a whole quantity and a valid cost");
  mxErr("");
  mxDr.push({ productId: PR[j][8], sku: PR[j][1], name: PR[j][0], qty: q, cost: rosMoney(c) });
  mxPoLines();
};

window.mxPoSave = async () => {
  if (!mxDr.length) return mxErr("Add at least one line");
  const orderDate = $("#po_d").value;
  if (!orderDate) return mxErr("Choose a date");
  try {
    const res = await MunnemAPI.createPurchaseOrder({
      supplierId: Number($("#po_s").value),
      orderDate,
      note: $("#po_n").value.trim(),
      lines: mxDr
    });
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Purchase order saved");
  } catch (err) {
    mxErr(err.message);
  }
};

window.mxPoAct = async (i, action) => {
  const p = MX.pos[i];
  if (!p) return;
  try {
    const res = await MunnemAPI.updatePurchaseOrderStatus(p.dbId, action);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || `${p.id} updated`);
  } catch (err) {
    T(err.message, 1);
  }
};

window.mxPayForm = i => {
  const p = MX.pos[i];
  const bal = rosMoney(mxPoTot(p) - p.paid);
  M(`<h2>Pay supplier · ${rosEsc(p.id)}</h2><div class="sub" style="margin-bottom:10px">Balance ${mxM(bal)}</div>${mxIn("Amount", "pp_a", bal, "number", 'min="0.01" step="0.01"')}<label class="f">Paid from<select class="in" id="pp_b"><option value="">Cash / not tracked in an account</option>${MX.banks.map(b => `<option value="${b.id}">${rosEsc(b.name)}</option>`).join("")}</select></label>${mxBtns("mxPaySave(" + i + ")", "Record payment")}`);
};

window.mxPaySave = async i => {
  const p = MX.pos[i];
  const amount = rosMoney(+$("#pp_a").value);
  const bankAccountId = $("#pp_b").value ? Number($("#pp_b").value) : null;
  try {
    const res = await MunnemAPI.payPurchaseOrder(p.dbId, { amount, bankAccountId });
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Payment recorded");
  } catch (err) {
    mxErr(err.message);
  }
};

// ============================================================================
// 11. SERVICES MODULE
// ============================================================================
V.services = () =>
  ph("Services", "Non-stock items you charge for, such as repairs, delivery or installation.", `<button class="btn p" onclick="mxSvForm(-1)">Add service</button>`) +
  (MX.services.length
    ? mxTbl(
        ["Service", "Unit", "Price", "Tax", "Status", ""],
        MX.services.map((s, i) => `<tr><td><b>${rosEsc(s.name)}</b></td><td>${rosEsc(s.unit)}</td><td>${mxM(s.price)}</td><td>${s.tax}%</td><td><span class="b ${s.active ? "ok" : "wn"}">${s.active ? "Active" : "Inactive"}</span></td><td><button class="btn s" onclick="mxSvForm(${i})">Edit</button> <button class="btn s dg" onclick="mxSvDel(${i})">Delete</button></td></tr>`)
      )
    : mxEmpty("No services yet", "Add the services you offer with their price and tax.", `<button class="btn p" onclick="mxSvForm(-1)">Add service</button>`));

window.mxSvForm = i => {
  const s = MX.services[i] || { active: true, unit: "job", tax: MX.taxes[0]?.r || 0 };
  M(`<h2>${i < 0 ? "Add" : "Edit"} service</h2>${mxIn("Service name", "v_n", s.name || "", "text", 'maxlength="120"')}<div class="fg">${mxIn("Price (excl. tax)", "v_p", s.price ?? "", "number", 'min="0" step="0.01"')}${mxIn("Unit (hour, visit, job…)", "v_u", s.unit)}</div><label class="f">Tax<select class="in" id="v_t">${MX.taxes.map(t => `<option value="${t.r}"${t.r == s.tax ? " selected" : ""}>${rosEsc(t.n)}</option>`).join("")}</select></label>${mxIn("Description (optional)", "v_d", s.desc || "")}<label class="f" style="display:flex;flex-direction:row;gap:8px;align-items:center"><input type="checkbox" id="v_a"${s.active ? " checked" : ""}> Active</label>${mxBtns("mxSvSave(" + i + ")", "Save service")}`);
};

window.mxSvSave = async i => {
  const name = $("#v_n").value.trim();
  const price = +$("#v_p").value;
  if (!name) return mxErr("Service name is required");
  if ($("#v_p").value === "" || !(price >= 0)) return mxErr("Enter a valid price");
  try {
    const payload = {
      name,
      price: rosMoney(price),
      unit: $("#v_u").value.trim() || "job",
      taxRate: +$("#v_t").value,
      description: $("#v_d").value.trim(),
      active: $("#v_a").checked
    };
    const res = i < 0
      ? await MunnemAPI.createService(payload)
      : await MunnemAPI.updateService(MX.services[i].id, payload);
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Service saved");
  } catch (err) {
    mxErr(err.message);
  }
};

window.mxSvDel = async i => {
  const s = MX.services[i];
  if (!s) return;
  try {
    const res = await MunnemAPI.deleteService(s.id);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Service deleted");
  } catch (err) {
    T(err.message, 1);
  }
};

// ============================================================================
// 12. BANKING & FINANCE MODULE
// ============================================================================
const mxSign = t => /^(Deposit|Transfer in)$/.test(t.type) ? 1 : -1;
const mxBal = a => rosMoney(a.open + MX.btx.filter(t => t.acc == a.id).reduce((s, t) => s + mxSign(t) * t.amt, 0));
const mxAcc = id => (MX.banks.find(b => b.id == id) || { name: "(account)" }).name;

window.mxFi = t => {
  S.fi = t;
  route(1);
};

function mxPL(f, t) {
  const a = new Date(f + "T00:00:00"), b = new Date(t + "T23:59:59.999");
  const r = { n: 0, sales: 0, tax: 0, cogs: 0, exp: 0, rec: {} };
  IN.forEach((n, ix) => {
    const d = new Date(n[7] || n[2]);
    if (isNaN(d) || d < a || d > b) return;
    const ls = (IT[ix] || []).map(l => ({
      q: Number(l[1] || 0),
      pr: Number(l[3] ?? PR[l[0]]?.[4] ?? 0),
      g: Number(l[4] ?? PR[l[0]]?.[7] ?? 0),
      c: Number(l[5] ?? PR[l[0]]?.[3] ?? 0)
    }));
    r.n++;
    r.sales += Number(n[3] || 0);
    r.tax += Number(n[17] || ls.reduce((s, l) => s + (l.pr * l.q * l.g) / 100, 0));
    r.cogs += ls.reduce((s, l) => s + l.c * l.q, 0);
  });
  ROS.expenses.forEach(e => {
    const d = new Date(e.date + "T12:00:00");
    if (!isNaN(d) && d >= a && d <= b) r.exp += e.amount;
  });
  ROS.payments.forEach(p => {
    const d = new Date(p.at);
    if (!isNaN(d) && d >= a && d <= b) r.rec[p.method] = (r.rec[p.method] || 0) + p.amount;
  });
  r.net = rosMoney(r.sales - r.tax);
  r.gp = rosMoney(r.net - r.cogs);
  r.np = rosMoney(r.gp - r.exp);
  return r;
}

V.finance = () => {
  const t = S.fi || "Accounts";
  let h =
    ph(
      "Banking & Finance",
      "Bank and cash accounts, transactions, expenses and profit & loss.",
      t == "Accounts"
        ? `<button class="btn p" onclick="mxBkForm()">Add account</button>`
        : t == "Transactions"
          ? `<button class="btn p" onclick="mxTxForm()">Add transaction</button>`
          : t == "Expenses"
            ? `<button class="btn p" onclick="go('business')">Record expense</button>`
            : ""
    ) + tabs(["Accounts", "Transactions", "Expenses", "Profit & Loss"], t, "mxFi");

  if (t == "Accounts") {
    h += MX.banks.length
      ? mxKpi([
          ["Total balance", mxM(MX.banks.reduce((s, b) => s + mxBal(b), 0))],
          ["Accounts", MX.banks.length]
        ]) +
        mxTbl(
          ["Account", "Type", "Opening", "Balance", ""],
          MX.banks.map((b, i) => `<tr><td><b>${rosEsc(b.name)}</b></td><td>${rosEsc(b.type)}</td><td>${mxM(b.open)}</td><td><b>${mxM(mxBal(b))}</b></td><td><button class="btn s dg" onclick="mxBkDel(${i})">Delete</button></td></tr>`)
        )
      : mxEmpty("No accounts yet", "Add a bank or cash account with its real opening balance.", `<button class="btn p" onclick="mxBkForm()">Add account</button>`);
  } else if (t == "Transactions") {
    h += MX.btx.length
      ? mxTbl(
          ["Date", "Account", "Type", "Amount", "Note"],
          MX.btx.map(x => `<tr><td>${mxD(x.date)}</td><td>${rosEsc(mxAcc(x.acc))}</td><td>${rosEsc(x.type)}</td><td>${mxSign(x) > 0 ? "+" : "−"}${mxM(x.amt)}</td><td>${rosEsc(x.note || "")}</td></tr>`)
        )
      : mxEmpty("No transactions yet", "Record deposits, withdrawals and transfers between your accounts.", `<button class="btn p" onclick="mxTxForm()">Add transaction</button>`);
  } else if (t == "Expenses") {
    const c = {};
    ROS.expenses.forEach(e => (c[e.category] = (c[e.category] || 0) + e.amount));
    h += ROS.expenses.length
      ? mxKpi([
          ["Total expenses", mxM(ROS.expenses.reduce((s, e) => s + e.amount, 0))],
          ...Object.entries(c).map(([k, v]) => [rosEsc(k), mxM(v)])
        ]) +
        mxTbl(
          ["Date", "Expense", "Category", "Amount", ""],
          ROS.expenses.map(e => `<tr><td>${mxD(e.date)}</td><td>${rosEsc(e.title)}</td><td>${rosEsc(e.category)}</td><td>${mxM(e.amount)}</td><td><button class="btn s dg" onclick="rosDeleteExpense(${e.id})">Delete</button></td></tr>`)
        )
      : mxEmpty("No expenses recorded", "Use Business Hub to record your shop expenses.", `<button class="btn p" onclick="go('business')">Record expense</button>`);
  } else {
    const f = S.pf || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = S.pt || mxToday();
    const r = mxPL(f, to);
    h +=
      `<div class="card row wr" style="margin-bottom:14px">${mxIn("From", "pl_f", f, "date")}${mxIn("To", "pl_t", to, "date")}<button class="btn p" onclick="S.pf=$('#pl_f').value;S.pt=$('#pl_t').value;route(1)">Apply</button></div>` +
      mxKpi([
        ["Net sales (excl. GST)", mxM(r.net)],
        ["Gross profit", mxM(r.gp)],
        ["Expenses", mxM(r.exp)],
        ["Net profit", mxM(r.np)]
      ]) +
      `<div class="card" style="margin-bottom:14px"><h3 style="margin-bottom:10px">Where the money went</h3>${bars([Math.max(0, r.net), Math.max(0, r.cogs), Math.max(0, r.exp)], ["Net sales", "Cost of goods", "Expenses"])}</div>` +
      mxTbl(
        ["Line", "Amount"],
        [
          ["Invoices in period", r.n],
          ["Sales incl. GST", mxM(r.sales)],
          ["GST collected", mxM(r.tax)],
          ["Net sales", mxM(r.net)],
          ["Cost of goods sold", mxM(r.cogs)],
          ["Gross profit", mxM(r.gp)],
          ["Expenses", mxM(r.exp)],
          ["Net profit", mxM(r.np)],
          ...Object.entries(r.rec).map(([k, v]) => ["Received via " + rosEsc(k), mxM(v)])
        ].map(x => `<tr><td>${x[0]}</td><td><b>${x[1]}</b></td></tr>`)
      );
  }
  return h;
};

window.mxBkForm = () =>
  M(`<h2>Add account</h2>${mxIn("Account name", "b_n", "", "text", 'maxlength="80"')}<label class="f">Type<select class="in" id="b_t"><option>Bank</option><option>Cash</option><option>Wallet</option></select></label>${mxIn("Opening balance", "b_o", "0", "number", 'step="0.01"')}${mxBtns("mxBkSave()", "Save account")}`);

window.mxBkSave = async () => {
  const name = $("#b_n").value.trim();
  const openingBalance = $("#b_o").value;
  if (!name) return mxErr("Account name is required");
  if (openingBalance === "" || !isFinite(+openingBalance)) return mxErr("Enter the opening balance (0 if none)");
  try {
    const res = await MunnemAPI.createBankAccount({
      name,
      type: $("#b_t").value,
      openingBalance: rosMoney(+openingBalance)
    });
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Account added");
  } catch (err) {
    mxErr(err.message);
  }
};

window.mxBkDel = async i => {
  const b = MX.banks[i];
  if (!b) return;
  try {
    const res = await MunnemAPI.deleteBankAccount(b.id);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Account deleted");
  } catch (err) {
    T(err.message, 1);
  }
};

window.mxTxForm = () => {
  if (!MX.banks.length) return T("Add an account first", 1);
  const o = MX.banks.map(b => `<option value="${b.id}">${rosEsc(b.name)}</option>`).join("");
  M(`<h2>Add transaction</h2><label class="f">Account<select class="in" id="t_a">${o}</select></label><label class="f">Type<select class="in" id="t_t" onchange="$('#t_x').style.display=this.value=='Transfer'?'block':'none'"><option>Deposit</option><option>Withdrawal</option><option>Transfer</option></select></label><label class="f" id="t_x" style="display:none">To account<select class="in" id="t_b">${o}</select></label><div class="fg">${mxIn("Amount", "t_m", "", "number", 'min="0.01" step="0.01"')}${mxIn("Date", "t_d", mxToday(), "date")}</div>${mxIn("Note (optional)", "t_n", "")}${mxBtns("mxTxSave()", "Save transaction")}`);
};

window.mxTxSave = async () => {
  const accountId = Number($("#t_a").value);
  const type = $("#t_t").value;
  const amount = rosMoney(+$("#t_m").value);
  const date = $("#t_d").value;
  const note = $("#t_n").value.trim();
  const toAccountId = $("#t_b") ? Number($("#t_b").value) : null;
  if (!(amount > 0) || !date) return mxErr("Enter a valid amount and date");
  try {
    const res = await MunnemAPI.createBankTransaction({
      accountId,
      toAccountId,
      type,
      amount,
      date,
      note
    });
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Transaction saved");
  } catch (err) {
    mxErr(err.message);
  }
};

// ============================================================================
// 13. SETTINGS, BUSINESS SETTINGS & USERS MODULE
// ============================================================================
V.settings = () => {
  const d = ROS.settings || {};
  return (
    ph("Settings", "Edit your business profile, address, GSTIN and invoice prefix stored in MySQL.") +
    `<div class="card"><h3 style="margin-bottom:14px">Business profile</h3>
      <div class="fg">
        <label class="f">Business name<input class="in" id="setShop" maxlength="120" value="${rosEsc(d.shopName || "")}"></label>
        <label class="f">Owner name<input class="in" id="setOwner" maxlength="100" value="${rosEsc(d.owner || "")}"></label>
        <label class="f">Phone<input class="in" id="setPhone" maxlength="30" value="${rosEsc(d.phone || "")}"></label>
        <label class="f">State<input class="in" id="setState" maxlength="80" value="${rosEsc(d.state || "")}"></label>
        <label class="f">City<input class="in" id="setCity" maxlength="80" value="${rosEsc(d.city || "")}"></label>
        <label class="f">PIN code<input class="in" id="setPin" maxlength="20" value="${rosEsc(d.pinCode || "")}"></label>
        <label class="f">Address<input class="in" id="setAddress" maxlength="200" value="${rosEsc(d.address || "")}"></label>
        <label class="f">GSTIN (optional)<input class="in" id="setGstin" maxlength="15" value="${rosEsc(d.gstin || "")}"></label>
        <label class="f">Invoice prefix<input class="in" id="setPrefix" maxlength="12" value="${rosEsc(d.prefix || "INV")}"></label>
        <label class="f">Currency<div class="in" aria-readonly="true">${rosEsc(MXC.code)} (${rosEsc(MXC.sym.trim())})</div></label>
      </div>
      <button class="btn p" onclick="rosSaveSettings()">Save settings</button>
    </div>`
  );
};

window.rosSaveSettings = async () => {
  const shopName = $("#setShop").value.trim();
  const owner = $("#setOwner").value.trim();
  const phone = $("#setPhone").value.trim();
  const state = $("#setState").value.trim();
  const city = $("#setCity").value.trim();
  const pinCode = $("#setPin").value.trim();
  const address = $("#setAddress").value.trim();
  const gstin = $("#setGstin").value.trim().toUpperCase();
  const prefix = $("#setPrefix").value.trim();
  if (!shopName || !prefix) return T("Enter a business name and invoice prefix", 1);
  try {
    const res = await MunnemAPI.updateSettings({
      shopName,
      owner,
      phone,
      state,
      city,
      pinCode,
      address,
      gstin,
      prefix
    });
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Settings saved successfully");
  } catch (err) {
    T(err.message, 1);
  }
};

const MXCUR = [
  ["INR", "₹", "en-IN"],
  ["USD", "$", "en-US"],
  ["EUR", "€", "de-DE"],
  ["GBP", "£", "en-GB"],
  ["AED", "AED ", "en-AE"],
  ["BDT", "৳", "bn-BD"]
];

V.msettings = () => {
  const t = MX.tpl, c = MX.cur;
  return (
    ph("Business Settings", "Currency, taxes, invoice template design and backup.", `<button class="btn" onclick="go('settings')">Shop profile</button>`) +
    `<div class="g g3">
      <div class="card"><h3>Currency</h3><label class="f">Currency<select class="in" id="c_c">${MXCUR.map(x => `<option value="${x[0]}"${x[0] == c.code ? " selected" : ""}>${x[0]} (${x[1].trim()})</option>`).join("")}</select></label><button class="btn p" onclick="mxCurSave()">Save currency</button><div class="sub" style="margin-top:8px">Dashboards, invoices and screens use this currency symbol.</div></div>
      <div class="card"><h3>Business GSTIN</h3>${mxIn("GSTIN (optional)", "g_g", MX.profile.gstin || "", "text", 'maxlength="15"')}<button class="btn p" onclick="mxGstSave()">Save GSTIN</button><div class="sub" style="margin-top:8px">Printed on tax invoices when entered.</div></div>
      <div class="card"><h3>Taxes</h3>${mxTbl(["Name", "Rate", ""], MX.taxes.map((x, i) => `<tr><td>${rosEsc(x.n)}</td><td>${x.r}%</td><td><button class="btn s dg" onclick="mxTaxDel(${i})">Remove</button></td></tr>`))}<div class="fg">${mxIn("Name", "x_n", "")}${mxIn("Rate %", "x_r", "", "number", 'min="0" max="100" step="0.01"')}</div><button class="btn p" onclick="mxTaxAdd()">Add tax</button></div>
    </div>
    <div class="card" style="margin-top:14px"><h3 style="margin-bottom:10px">Invoice design</h3><div class="fg"><label class="f">Accent colour<input class="in" id="i_a" type="color" value="${rosEsc(t.accent)}"></label><label class="f">Paper size<select class="in" id="i_s">${["A4", "A5", "80mm"].map(x => `<option${x == t.size ? " selected" : ""}>${x}</option>`).join("")}</select></label></div>${mxIn("Header line (e.g. tagline)", "i_h", t.head, "text", 'maxlength="120"')}<label class="f">Footer / terms<textarea class="in" id="i_f" rows="3" maxlength="500">${rosEsc(t.foot)}</textarea></label><label class="f">Logo (PNG/JPG, max 150 KB)<input class="in" type="file" id="i_l" accept="image/png,image/jpeg"></label><div class="row wr"><button class="btn p" onclick="mxTplSave()">Save design</button>${t.logo ? `<button class="btn" onclick="mxLogoDel()">Remove logo</button>` : ""}<button class="btn" onclick="go('invoices')">Preview on an invoice</button></div></div>`
  );
};

window.mxCurSave = async () => {
  try {
    const res = await MunnemAPI.updateSettings({ currency: $("#c_c").value });
    applyWorkspace(res.workspace);
    route(1);
    T("Currency saved");
  } catch (err) {
    T(err.message, 1);
  }
};

window.mxGstSave = async () => {
  const gstin = $("#g_g").value.trim().toUpperCase();
  try {
    const res = await MunnemAPI.updateSettings({ gstin });
    applyWorkspace(res.workspace);
    route(1);
    T("GSTIN saved");
  } catch (err) {
    T(err.message, 1);
  }
};

window.mxTaxAdd = async () => {
  const name = $("#x_n").value.trim();
  const rate = +$("#x_r").value;
  if (!name || $("#x_r").value === "" || !(rate >= 0 && rate <= 100)) {
    return T("Enter a tax name and a rate from 0 to 100", 1);
  }
  try {
    const res = await MunnemAPI.addTax({ name, rate });
    applyWorkspace(res.workspace);
    route(1);
    T("Tax added");
  } catch (err) {
    T(err.message, 1);
  }
};

window.mxTaxDel = async i => {
  const tax = MX.taxes[i];
  if (!tax || !tax.id) return;
  try {
    const res = await MunnemAPI.deleteTax(tax.id);
    applyWorkspace(res.workspace);
    route(1);
    T("Tax removed");
  } catch (err) {
    T(err.message, 1);
  }
};

window.mxTplSave = async () => {
  const t = MX.tpl;
  const f = $("#i_l").files[0];
  let logo = t.logo;
  if (f) {
    if (f.size > 153600 || !/^image\/(png|jpeg)$/.test(f.type)) {
      return T("Logo must be a PNG or JPG under 150 KB", 1);
    }
    logo = await new Promise(a => {
      const r = new FileReader();
      r.onload = () => a(r.result);
      r.readAsDataURL(f);
    });
  }
  try {
    const res = await MunnemAPI.updateTemplate({
      accent: $("#i_a").value,
      size: $("#i_s").value,
      head: $("#i_h").value.trim(),
      foot: $("#i_f").value.trim(),
      logo
    });
    applyWorkspace(res.workspace);
    mxPage();
    route(1);
    T("Invoice design saved");
  } catch (err) {
    T(err.message, 1);
  }
};

window.mxLogoDel = async () => {
  try {
    const res = await MunnemAPI.updateTemplate({
      ...MX.tpl,
      logo: ""
    });
    applyWorkspace(res.workspace);
    route(1);
    T("Logo removed");
  } catch (err) {
    T(err.message, 1);
  }
};

// Staff Users Management (Owner only)
const mxRole = r => `<select class="in" id="u_r"><option value="manager"${r == "manager" ? " selected" : ""}>Manager</option><option value="cashier"${r == "cashier" ? " selected" : ""}>Cashier</option><option value="owner"${r == "owner" ? " selected" : ""}>Owner</option></select>`;

V.users = () =>
  ph("Users", "Add staff and control what each role can open. Owner: everything · Manager: all but Users and Business Settings · Cashier: billing, customers, products.", `<button class="btn p" onclick="mxUserForm()">Add user</button>`) +
  mxTbl(
    ["Name", "Email", "Role", "Status", ""],
    MX.users.map((u, i) => `<tr><td><b>${rosEsc(u.name)}</b></td><td>${rosEsc(u.email)}</td><td><select class="in" style="width:auto" onchange="mxUserRole(${i},this.value)" aria-label="Role">${["owner", "manager", "cashier"].map(r => `<option value="${r}"${u.role == r ? " selected" : ""}>${r}</option>`).join("")}</select></td><td><span class="b ${u.active ? "ok" : "er"}">${u.active ? "Active" : "Disabled"}</span></td><td><button class="btn s" onclick="mxUserPw(${i})">Reset password</button> <button class="btn s" onclick="mxUserTog(${i})">${u.active ? "Disable" : "Enable"}</button></td></tr>`)
  );

window.mxUserForm = () =>
  M(`<h2>Add user</h2>${mxIn("Name", "u_n", "", "text", 'maxlength="100"')}${mxIn("Email", "u_e", "", "email")}<label class="f">Role${mxRole("cashier")}</label>${mxIn("Temporary password (min 8)", "u_p", "", "password", 'autocomplete="new-password"')}${mxBtns("mxUserSave()", "Add user")}`);

window.mxUserSave = async () => {
  const name = $("#u_n").value.trim();
  const email = $("#u_e").value.trim().toLowerCase();
  const password = $("#u_p").value;
  const role = $("#u_r").value;
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return mxErr("Enter a name and valid email");
  if (password.length < 8) return mxErr("Password must be at least 8 characters");
  try {
    const res = await MunnemAPI.createUser({ name, email, password, role });
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "User added");
  } catch (err) {
    mxErr(err.message);
  }
};

window.mxUserRole = async (i, role) => {
  const u = MX.users[i];
  if (!u) return;
  try {
    const res = await MunnemAPI.updateUserRole(u.id, role);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "Role updated");
  } catch (err) {
    T(err.message, 1);
    route(1);
  }
};

window.mxUserTog = async i => {
  const u = MX.users[i];
  if (!u) return;
  try {
    const res = await MunnemAPI.toggleUserStatus(u.id);
    applyWorkspace(res.workspace);
    route(1);
    T(res.message || "User updated");
  } catch (err) {
    T(err.message, 1);
  }
};

window.mxUserPw = i =>
  M(`<h2>Reset password</h2><div class="sub" style="margin-bottom:10px">${rosEsc(MX.users[i].email)}</div>${mxIn("New password (min 8)", "u_p", "", "password", 'autocomplete="new-password"')}${mxBtns("mxUserPwSave(" + i + ")", "Save")}`);

window.mxUserPwSave = async i => {
  const password = $("#u_p").value;
  if (password.length < 8) return mxErr("Password must be at least 8 characters");
  try {
    const res = await MunnemAPI.resetUserPassword(MX.users[i].id, password);
    applyWorkspace(res.workspace);
    X();
    route(1);
    T(res.message || "Password updated");
  } catch (err) {
    mxErr(err.message);
  }
};

// ============================================================================
// 14. NAVIGATION, ROUTING & ROLE-BASED ACCESS CONTROL
// ============================================================================
const MXNV = [
  ["overview", "Overview", "home"],
  ["products", "Products", "box"],
  ["inventory", "Inventory", "layers"],
  ["billing", "Billing & Invoices", "receipt"],
  ["customers", "Customers", "users"],
  ["reports", "Reports & Analytics", "chart"],
  ["gst", "GST Centre", "pct"],
  ["settings", "Settings", "gear"],
  ["business", "Business Hub", "layers"],
  ["purchases", "Purchases & Suppliers", "box"],
  ["services", "Services", "receipt"],
  ["finance", "Banking & Finance", "chart"],
  ["users", "Users", "users"],
  ["msettings", "Business Settings", "gear"]
];
const NV = MXNV.slice();
const PM = { invoices: "billing", invoice: "billing", customer: "customers" };

const MXR = {
  owner: "*",
  manager: ["overview", "products", "inventory", "billing", "invoices", "invoice", "customers", "customer", "reports", "gst", "settings", "business", "purchases", "finance", "services"],
  cashier: ["overview", "billing", "invoices", "invoice", "customers", "customer", "products"]
};
const mxOk = h => {
  const r = MXR[MXU && MXU.role];
  return r == "*" || (r || []).includes(h);
};

window.route = function(q) {
  if (!MXU) return;
  const h = location.hash.slice(1) || "overview";
  if (V[h] && !mxOk(h) && !mxOk(PM[h])) {
    location.hash = "overview";
    return;
  }
  const f = V[h] ? h : "overview";
  const a = PM[f] || f;
  const n = NV.find(x => x[0] == a) || NV[0];

  document.body.classList.remove("dr");
  $("#nv").innerHTML = NV.map(x => `<a class="${x[0] == a ? "on" : ""}" onclick="go('${x[0]}')">${i(x[2])}<span class="lb">${x[1]}</span></a>`).join("");
  $("#pt").innerHTML = `<span class="hm">MUNNEM / </span>${n ? n[1] : "Overview"}`;
  const p = PA[f];
  $("#pa").innerHTML = p ? `<button class="btn p" onclick="${p[1]}">${f == "billing" || f == "overview" || f == "invoices" ? i("plus") : ""}<span class="hm">${p[0]}</span></button>` : "";

  const go2 = () => {
    $("#v").innerHTML = V[f]();
    if (f == "products") pt();
    if (f == "billing") {
      bg();
      bc();
    }
    mxDeco();
    if (window.LG && window.LG !== "en") window.tr(document.body);
    scrollTo(0, 0);
  };
  if (q) return go2();
  $("#v").innerHTML = `<div class="sk" style="height:34px;width:260px;margin-bottom:20px"></div><div class="g g3">${"<div class='sk' style='height:120px'></div>".repeat(6)}</div><div class="sk" style="height:260px"></div>`;
  setTimeout(go2, 120);
};

function mxPage() {
  let s = $("#mxPg");
  if (!s) {
    s = document.createElement("style");
    s.id = "mxPg";
    document.head.append(s);
  }
  s.textContent = "@page{size:" + (MX.tpl.size == "80mm" ? "80mm auto" : MX.tpl.size) + ";margin:10mm}";
}

window.mxPdf = () => {
  mxPage();
  T("Opening print/PDF dialog — choose “Save as PDF” as destination");
  setTimeout(() => print(), 250);
};

function mxDeco() {
  if (!MXU) return;
  const s = ROS.settings || {};
  const ini = t => (t || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const t = MX.tpl;

  if ($("#mxAv")) $("#mxAv").textContent = ini(s.shopName);
  if ($("#mxBz")) $("#mxBz").innerHTML = rosEsc(s.shopName || "My Business") + `<small>${rosEsc(s.state || "")}</small>`;
  if ($("#mxAv2")) $("#mxAv2").textContent = ini(MXU.name);
  if ($("#mxMe")) $("#mxMe").innerHTML = rosEsc(MXU.name) + `<br><span class="sub">${MXU.role[0].toUpperCase() + MXU.role.slice(1)} · ${rosEsc(s.shopName)}</span>`;

  document.querySelectorAll(".pp:not([data-mx])").forEach(p => {
    p.dataset.mx = 1;
    p.style.borderTop = "5px solid " + t.accent;
    p.insertAdjacentHTML(
      "afterbegin",
      (t.logo ? `<img src="${t.logo}" alt="Logo" style="max-height:56px;max-width:160px;margin-bottom:8px">` : "") +
      (t.head ? `<div class="sub" style="margin-bottom:6px">${rosEsc(t.head)}</div>` : "")
    );
    if (t.foot) {
      p.insertAdjacentHTML("beforeend", `<div class="sub" style="margin-top:14px;white-space:pre-wrap">${rosEsc(t.foot)}</div>`);
    }
    if (t.size == "80mm") p.style.maxWidth = "80mm";
  });
}

// ============================================================================
// 15. MULTI-BUSINESS AUTHENTICATION GATE (Sign In & Register New Business)
// ============================================================================
const mxg = () => $("#mxa");

window.mxGate = function(mode) {
  const reg = mode === "reg";
  mxg().style.display = "flex";
  mxg().innerHTML = `<div class="card mxbox">
    <div class="logo" style="margin-bottom:8px;color:var(--tx)"><span class="lg">M</span><span class="lb" style="display:inline">MUNNEM</span></div>
    <h2>${reg ? "Register a New Business Account" : "Sign in to MUNNEM"}</h2>
    <div class="sub" style="margin-bottom:14px">${
      reg
        ? "Create an isolated MySQL workspace for your retail business. Your account starts completely fresh and empty."
        : "Sign in with your business email and password."
    }</div>
    ${
      reg
        ? `<div class="fg">
            <label class="f">Business / Shop name *<input class="in" id="ra_b" maxlength="120" placeholder="e.g. Verma Kirana Store"></label>
            <label class="f">Owner full name *<input class="in" id="ra_n" maxlength="100" placeholder="e.g. Amit Verma"></label>
            <label class="f">Phone<input class="in" id="ra_p" maxlength="20" placeholder="+91 98765 43210"></label>
            <label class="f">State<input class="in" id="ra_s" maxlength="60" placeholder="e.g. Uttar Pradesh"></label>
            <label class="f">City<input class="in" id="ra_city" maxlength="60" placeholder="e.g. Lucknow"></label>
            <label class="f">GSTIN (optional)<input class="in" id="ra_gstin" maxlength="15" placeholder="15-digit GSTIN"></label>
          </div>
          <label class="f">Shop address (optional)<input class="in" id="ra_addr" maxlength="200" placeholder="Street / Market address"></label>`
        : ""
    }
    <label class="f">Email address *<input class="in" id="ra_e" type="email" autocomplete="username" placeholder="you@business.com"></label>
    <div class="${reg ? "fg" : ""}">
      <label class="f">Password${reg ? " (min 8 chars) *" : ""}<input class="in" id="ra_w" type="password" autocomplete="${reg ? "new-password" : "current-password"}"></label>
      ${reg ? `<label class="f">Confirm password *<input class="in" id="ra_c" type="password" autocomplete="new-password"></label>` : ""}
    </div>
    <div class="err" id="ra_x" role="alert" style="margin-bottom:10px"></div>
    <button class="btn p" id="authSubmitBtn" style="width:100%;justify-content:center" onclick="${reg ? "mxReg()" : "mxLogin()"}">${reg ? "Create Business Workspace" : "Sign In"}</button>
    <div style="margin-top:14px;text-align:center;font-size:13px">
      ${
        reg
          ? `Already have a business account? <a style="color:var(--ac);font-weight:600;cursor:pointer" onclick="mxGate('login')">Sign in</a>`
          : `New business owner? <a style="color:var(--ac);font-weight:600;cursor:pointer" onclick="mxGate('reg')">Register a new business</a>`
      }
    </div>
  </div>`;
  mxg().onkeydown = e => {
    if (e.key === "Enter") reg ? mxReg() : mxLogin();
  };
};

window.mxReg = async () => {
  const v = id => ($("#" + id) ? $("#" + id).value.trim() : "");
  const businessName = v("ra_b");
  const ownerName = v("ra_n");
  const email = v("ra_e").toLowerCase();
  const password = $("#ra_w") ? $("#ra_w").value : "";
  const confirmPw = $("#ra_c") ? $("#ra_c").value : "";

  if (!businessName || !ownerName) return mxErr("Enter your business name and owner name");
  if (!/^\S+@\S+\.\S+$/.test(email)) return mxErr("Enter a valid email address");
  if (password.length < 8) return mxErr("Password must be at least 8 characters");
  if (password !== confirmPw) return mxErr("Passwords do not match");

  try {
    const res = await MunnemAPI.register({
      businessName,
      ownerName,
      email,
      password,
      phone: v("ra_p"),
      state: v("ra_s"),
      city: v("ra_city"),
      gstin: v("ra_gstin"),
      address: v("ra_addr")
    });
    await mxStart(res.user, res.workspace);
    T(res.message || "Business account created!");
  } catch (err) {
    mxErr(err.message);
  }
};

window.mxLogin = async () => {
  const email = ($("#ra_e") ? $("#ra_e").value.trim() : "").toLowerCase();
  const password = $("#ra_w") ? $("#ra_w").value : "";
  if (!email || !password) return mxErr("Enter your email and password");
  try {
    const res = await MunnemAPI.login({ email, password });
    await mxStart(res.user, res.workspace);
    T("Signed in to " + (res.workspace?.business?.business_name || "MUNNEM"));
  } catch (err) {
    mxErr(err.message);
  }
};

window.mxLogout = async () => {
  try {
    await MunnemAPI.logout();
  } catch (e) {}
  MXU = null;
  PR = [];
  CU = [];
  IN = [];
  IT = [];
  ROS.payments = [];
  ROS.movements = [];
  ROS.expenses = [];
  ROS.purchaseList = [];
  ROS.audit = [];
  MX.suppliers = [];
  MX.pos = [];
  MX.banks = [];
  MX.btx = [];
  MX.services = [];
  MX.users = [];
  S.cart = [];
  $("#v").innerHTML = "";
  location.hash = "";
  mxGate("login");
  T("Signed out successfully");
};

async function mxStart(user, workspace) {
  MXU = user;
  NV.length = 0;
  MXNV.filter(x => mxOk(x[0])).forEach(x => NV.push(x));
  applyWorkspace(workspace);
  mxPage();
  mxg().style.display = "none";
  mxg().innerHTML = "";
  const h = location.hash.slice(1);
  if (h && V[h] && !mxOk(h) && !mxOk(PM[h])) location.hash = "overview";
  route(1);
}

// ============================================================================
// 16. INITIALIZATION & GLOBAL EVENT LISTENERS
// ============================================================================
async function initMunnemApp() {
  $("#hp").innerHTML = i("help") + '<span class="lb">Help & support</span>';
  $("#cl").innerHTML = i("left") + '<span class="lb">Collapse</span>';
  $("#mb").innerHTML = i("menu");
  $("#bn").innerHTML = i("bell");
  $("#hb").innerHTML = i("help");
  $("#th").innerHTML = i("moon");

  $("#lg").innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  $("#lg").value = window.LG || "en";

  addEventListener("hashchange", () => route());
  document.addEventListener("click", e => {
    if (!e.target.closest(".ib,.av")) {
      document.querySelectorAll(".dd").forEach(x => x.classList.remove("o"));
    }
  });
  document.addEventListener("mousemove", e => {
    const t = e.target.closest("[data-tip]"), p = $("#tip");
    if (t && p) {
      p.innerHTML = t.dataset.tip;
      p.style.display = "block";
      p.style.left = Math.min(e.clientX + 14, innerWidth - 170) + "px";
      p.style.top = e.clientY + 14 + "px";
    } else if (p) {
      p.style.display = "none";
    }
  });

  try {
    const res = await MunnemAPI.me();
    await mxStart(res.user, res.workspace);
  } catch (err) {
    mxGate("login");
  }
}

initMunnemApp();
