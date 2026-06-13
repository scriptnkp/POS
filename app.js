// ── Config ──
const STORE = 'POS Pro ร้านค้า';
const LOW_AT = 5;

// ── State ──
let products = [
  { id:1,  name:'น้ำดื่ม 600ml',       price:7,   stock:48, cat:'เครื่องดื่ม', emoji:'💧', barcode:'8850001234567', alertAt:5 },
  { id:2,  name:'โค้ก 325ml',          price:15,  stock:24, cat:'เครื่องดื่ม', emoji:'🥤', barcode:'8850009876543', alertAt:5 },
  { id:3,  name:'กาแฟสำเร็จรูป',       price:8,   stock:3,  cat:'เครื่องดื่ม', emoji:'☕', barcode:'8850001111111', alertAt:5 },
  { id:4,  name:'ข้าวเหนียวหมูย่าง',   price:40,  stock:12, cat:'อาหาร',       emoji:'🍱', barcode:'',             alertAt:3 },
  { id:5,  name:'บะหมี่กึ่งสำเร็จรูป', price:6,   stock:0,  cat:'อาหาร',       emoji:'🍜', barcode:'8850002222222', alertAt:5 },
  { id:6,  name:'ขนมปัง',              price:35,  stock:8,  cat:'อาหาร',       emoji:'🍞', barcode:'',             alertAt:3 },
  { id:7,  name:'ยาสีฟัน',             price:45,  stock:15, cat:'ของใช้',      emoji:'🪥', barcode:'8850003333333', alertAt:5 },
  { id:8,  name:'สบู่',               price:25,  stock:20, cat:'ของใช้',      emoji:'🧼', barcode:'8850004444444', alertAt:5 },
  { id:9,  name:'ซองชา',              price:12,  stock:30, cat:'เครื่องดื่ม', emoji:'🍵', barcode:'8850005555555', alertAt:10 },
  { id:10, name:'น้ำตาล 1kg',          price:28,  stock:18, cat:'ของชำ',       emoji:'🧂', barcode:'8850006666666', alertAt:5 },
  { id:11, name:'นมสด',               price:18,  stock:4,  cat:'เครื่องดื่ม', emoji:'🥛', barcode:'8850007777777', alertAt:5 },
  { id:12, name:'ไข่ไก่ (แผง)',        price:120, stock:6,  cat:'ของชำ',       emoji:'🥚', barcode:'',             alertAt:2 },
];
let cart = [];
let nextId = 13;
let transactions = [];
let editId = null;
let activeCat = 'ทั้งหมด';
let cashStr = '0';
let cartExpanded = false;

// ── Helpers ──
const fmt = n => '฿' + Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 });
const fmtN = n => Number(n).toLocaleString('th-TH');
const $ = id => document.getElementById(id);

function getTotals() {
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const dv = parseFloat($('discountVal').value) || 0;
  const dt = $('discountType').value;
  const disc = Math.min(dt === 'pct' ? sub * dv / 100 : dv, sub);
  return { sub, disc, total: Math.max(sub - disc, 0) };
}

// ── Toast ──
function toast(msg, type = 'info') {
  const c = $('toasts');
  const el = Object.assign(document.createElement('div'), { className: `toast ${type}`, textContent: msg });
  c.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 2200);
}

// ── Categories ──
function getCats() { return ['ทั้งหมด', ...new Set(products.map(p => p.cat))]; }

function renderCats() {
  $('catTabs').innerHTML = getCats().map(c =>
    `<button class="cat-tab${c === activeCat ? ' active' : ''}" onclick="setCat('${c}')">${c}</button>`
  ).join('');
}

function setCat(c) { activeCat = c; renderCats(); renderGrid(); }

// ── Product Grid ──
function renderGrid() {
  const q = $('searchInput').value.toLowerCase();
  let list = activeCat === 'ทั้งหมด' ? products : products.filter(p => p.cat === activeCat);
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
  if (!list.length) {
    $('productGrid').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">ไม่พบสินค้า</div>';
    return;
  }
  $('productGrid').innerHTML = list.map(p => {
    const isOut = p.stock === 0;
    const isLow = !isOut && p.stock <= p.alertAt;
    return `<div class="product-card${isOut ? ' out-stock' : ''}${isLow ? ' low-stock' : ''}" onclick="addToCart(${p.id})">
      <span class="product-emoji">${p.emoji}</span>
      <div class="p-name">${p.name}</div>
      <div class="p-price">${fmt(p.price)}</div>
      <div class="p-stock">${isOut ? 'หมด' : isLow ? `⚠ ${p.stock}` : `${p.stock}`}</div>
    </div>`;
  }).join('');
}

// ── Cart ──
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p || p.stock === 0) { toast('สินค้าหมด', 'error'); return; }
  const ex = cart.find(x => x.id === id);
  if (ex) {
    if (ex.qty >= p.stock) { toast('สินค้าไม่เพียงพอ', 'error'); return; }
    ex.qty++;
  } else {
    cart.push({ id, name: p.name, price: p.price, emoji: p.emoji, qty: 1 });
  }
  renderCart();
  if (!cartExpanded) expandCart();
  toast(`${p.emoji} ${p.name}`, 'success');
}

function changeQty(id, d) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  renderCart();
}

function clearCart() {
  if (!cart.length) return;
  cart = [];
  $('discountVal').value = '';
  renderCart();
}

function renderCart() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  $('cartCount').textContent = total;
  $('cartCountBadge').textContent = total;
  const { total: t } = getTotals();
  $('cartTotalPreview').textContent = cart.length ? fmt(t) : '';

  const el = $('cartItems');
  if (!cart.length) {
    el.innerHTML = '<div class="cart-empty"><span class="cart-empty-icon">🛒</span><span class="cart-empty-text">ยังไม่มีสินค้า</span></div>';
  } else {
    el.innerHTML = cart.map(i =>
      `<div class="cart-item">
        <span class="ci-emoji">${i.emoji}</span>
        <div class="ci-info">
          <div class="ci-name">${i.name}</div>
          <div class="ci-unit">${fmt(i.price)} / ชิ้น</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${i.id},-1)">−</button>
          <span class="qty-num">${i.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i.id},1)">+</button>
        </div>
        <span class="ci-total">${fmt(i.price * i.qty)}</span>
      </div>`
    ).join('');
  }

  const { sub, disc, total: tot } = getTotals();
  $('subTotal').textContent = fmt(sub);
  $('discAmt').textContent = '-' + fmt(disc);
  $('grandTotal').textContent = fmt(tot);

  const has = cart.length > 0;
  ['btnCash', 'btnReceipt', 'btnQR'].forEach(id => $( id).disabled = !has);
}

// ── Cart Drawer Toggle ──
function toggleCart() {
  cartExpanded = !cartExpanded;
  $('cartDrawer').classList.toggle('expanded', cartExpanded);
}

function expandCart() {
  cartExpanded = true;
  $('cartDrawer').classList.add('expanded');
}

// ── Payment ──
function openQR() {
  const { total } = getTotals();
  $('qrAmount').textContent = fmt(total);
  drawQR(total);
  openSheet('qrSheet');
}

function drawQR(amount) {
  const canvas = $('qrCanvas');
  canvas.width = 180; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 180, 180);
  ctx.fillStyle = '#000';
  const cells = 21, sz = 180 / cells;
  [[0,0],[14,0],[0,14]].forEach(([ox,oy]) => {
    ctx.fillStyle = '#000'; ctx.fillRect(ox*sz,oy*sz,7*sz,7*sz);
    ctx.fillStyle = '#fff'; ctx.fillRect((ox+1)*sz,(oy+1)*sz,5*sz,5*sz);
    ctx.fillStyle = '#000'; ctx.fillRect((ox+2)*sz,(oy+2)*sz,3*sz,3*sz);
  });
  const seed = Math.floor(amount * 137);
  for (let r = 0; r < cells; r++) for (let c = 0; c < cells; c++) {
    if ((r<8&&c<8)||(r<8&&c>12)||(r>12&&c<8)) continue;
    if (((seed*(r+3)*(c+7))%97) > 48) { ctx.fillStyle='#000'; ctx.fillRect(c*sz,r*sz,sz,sz); }
  }
}

function openCash() {
  cashStr = '0';
  const { total } = getTotals();
  $('cashDue').textContent = fmt(total);
  $('cashReceived').textContent = '0';
  $('changeShow').textContent = '';
  $('btnConfirmCash').disabled = true;
  openSheet('cashSheet');
}

function cashKey(k) {
  const { total } = getTotals();
  if (k === 'back') { cashStr = cashStr.length > 1 ? cashStr.slice(0,-1) : '0'; }
  else { cashStr = cashStr === '0' ? k : (cashStr.length < 8 ? cashStr + k : cashStr); }
  const val = parseInt(cashStr) || 0;
  $('cashReceived').textContent = fmtN(val);
  const ch = val - total;
  if (ch >= 0) {
    $('changeShow').textContent = `ทอน ${fmt(ch)}`;
    $('changeShow').style.color = 'var(--success)';
    $('btnConfirmCash').disabled = false;
  } else {
    $('changeShow').textContent = `ขาด ${fmt(-ch)}`;
    $('changeShow').style.color = 'var(--danger)';
    $('btnConfirmCash').disabled = true;
  }
}

function cashPreset(n) {
  cashStr = String((parseInt(cashStr) || 0) + n);
  cashKey(''); // retrigger display — override by calling directly:
  const { total } = getTotals();
  const val = parseInt(cashStr);
  $('cashReceived').textContent = fmtN(val);
  const ch = val - total;
  if (ch >= 0) {
    $('changeShow').textContent = `ทอน ${fmt(ch)}`;
    $('changeShow').style.color = 'var(--success)';
    $('btnConfirmCash').disabled = false;
  } else {
    $('changeShow').textContent = `ขาด ${fmt(-ch)}`;
    $('changeShow').style.color = 'var(--danger)';
    $('btnConfirmCash').disabled = true;
  }
}

function confirmPay(method) {
  const { sub, disc, total } = getTotals();
  const change = method === 'Cash' ? Math.max((parseInt(cashStr)||0) - total, 0) : 0;
  const tx = { id: 'R'+String(transactions.length+1).padStart(4,'0'), date: new Date(), items: [...cart], sub, disc, total, method, change };
  transactions.unshift(tx);
  cart.forEach(ci => { const p = products.find(x=>x.id===ci.id); if(p) p.stock = Math.max(0, p.stock - ci.qty); });
  closeSheet('qrSheet'); closeSheet('cashSheet');
  cart = [];
  $('discountVal').value = '';
  cartExpanded = false;
  $('cartDrawer').classList.remove('expanded');
  renderCart(); renderGrid(); checkLow();
  toast(`✅ ชำระแล้ว ${fmt(total)}${method==='Cash'?` | ทอน ${fmt(change)}`:''}`, 'success');
}

// ── Receipt ──
function buildReceiptHTML(tx) {
  const { items, sub, disc, total, method, change, date, id } = tx;
  return `<div class="receipt-body">
    <div class="receipt-head">
      <div class="store">${STORE}</div>
      <div class="meta">${new Date(date).toLocaleString('th-TH')} • ${id}</div>
      <div class="meta">${method==='Cash'?'💵 เงินสด':'📲 QR'}</div>
    </div>
    <hr class="r-divider">
    ${items.map(i=>`<div class="r-row"><span>${i.emoji} ${i.name} ×${i.qty}</span><span>${fmt(i.price*i.qty)}</span></div>`).join('')}
    <hr class="r-divider">
    ${disc>0?`<div class="r-row"><span>ส่วนลด</span><span style="color:var(--warning)">-${fmt(disc)}</span></div>`:''}
    <div class="r-row r-total-row"><span>ยอดรวม</span><span style="color:var(--accent)">${fmt(total)}</span></div>
    ${method==='Cash'?`<div class="r-row"><span>ทอน</span><span style="color:var(--success)">${fmt(change)}</span></div>`:''}
    <div class="receipt-thanks">ขอบคุณที่ใช้บริการ 🙏</div>
  </div>`;
}

function openReceiptPreview() {
  const { sub, disc, total } = getTotals();
  const fake = { id:'ตัวอย่าง', date: new Date(), items:[...cart], sub, disc, total, method:'Cash', change:0 };
  $('receiptBody').innerHTML = buildReceiptHTML(fake);
  openSheet('receiptSheet');
}

function openTxReceipt(id) {
  const tx = transactions.find(x => x.id === id);
  if (!tx) return;
  $('receiptBody').innerHTML = buildReceiptHTML(tx);
  openSheet('receiptSheet');
}

// ── Product Management ──
function renderProdList() {
  const q = ($('prodSearch').value || '').toLowerCase();
  const list = products.filter(p => !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q));
  $('prodList').innerHTML = list.map(p => {
    const sc = p.stock===0 ? 'sp-out' : p.stock<=p.alertAt ? 'sp-low' : 'sp-ok';
    const sl = p.stock===0 ? 'หมด' : p.stock<=p.alertAt ? `⚠${p.stock}` : p.stock;
    return `<div class="prod-row">
      <span class="pr-emoji">${p.emoji}</span>
      <div class="pr-info">
        <div class="pr-name">${p.name}</div>
        <div class="pr-meta">${p.cat}${p.barcode?' • '+p.barcode:''}</div>
      </div>
      <span class="pr-price">${fmt(p.price)}</span>
      <span class="stock-pill ${sc}">${sl}</span>
      <div class="pr-actions">
        <button class="icon-btn edit-btn" onclick="editProduct(${p.id})">✏️</button>
        <button class="icon-btn del-btn" onclick="delProduct(${p.id})">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function openAddProduct() {
  editId = null;
  ['pName','pPrice','pStock','pBarcode','pCat','pEmoji','pAlertAt'].forEach(id => $(id).value = '');
  $('prodModalTitle').textContent = '➕ เพิ่มสินค้า';
  openSheet('productSheet');
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editId = id;
  $('pName').value = p.name;
  $('pPrice').value = p.price;
  $('pStock').value = p.stock;
  $('pBarcode').value = p.barcode;
  $('pCat').value = p.cat;
  $('pEmoji').value = p.emoji;
  $('pAlertAt').value = p.alertAt;
  $('prodModalTitle').textContent = '✏️ แก้ไขสินค้า';
  openSheet('productSheet');
}

function saveProduct() {
  const name = $('pName').value.trim();
  const price = parseFloat($('pPrice').value) || 0;
  if (!name || price < 0) { toast('กรุณากรอกชื่อและราคา', 'error'); return; }
  const data = {
    name, price,
    stock: parseInt($('pStock').value) || 0,
    barcode: $('pBarcode').value.trim(),
    cat: $('pCat').value.trim() || 'ทั่วไป',
    emoji: $('pEmoji').value.trim() || '📦',
    alertAt: parseInt($('pAlertAt').value) || 5,
  };
  if (editId) { Object.assign(products.find(x=>x.id===editId), data); toast('บันทึกแล้ว','success'); }
  else { products.push({ id: nextId++, ...data }); toast('เพิ่มสินค้าแล้ว','success'); }
  closeSheet('productSheet');
  renderProdList(); renderCats(); renderGrid(); checkLow();
}

function delProduct(id) {
  if (!confirm('ลบสินค้านี้?')) return;
  products = products.filter(x => x.id !== id);
  renderProdList(); renderCats(); renderGrid(); toast('ลบแล้ว','info');
}

// ── Barcode Simulate ──
function simulateScan() {
  const btn = document.querySelector('.scan-btn');
  btn.classList.add('scanning');
  setTimeout(() => {
    btn.classList.remove('scanning');
    const pool = products.filter(p => p.barcode && p.stock > 0);
    if (!pool.length) { toast('ไม่พบบาร์โค้ด', 'error'); return; }
    const p = pool[Math.floor(Math.random() * pool.length)];
    $('searchInput').value = p.barcode;
    renderGrid();
    addToCart(p.id);
    setTimeout(() => { $('searchInput').value = ''; renderGrid(); }, 700);
  }, 600);
}

// ── Dashboard ──
function renderDash() {
  const todayStr = new Date().toDateString();
  const todayTx = transactions.filter(t => new Date(t.date).toDateString() === todayStr);
  const todayAmt = todayTx.reduce((s,t)=>s+t.total,0);
  const todayQty = todayTx.reduce((s,t)=>s+t.items.reduce((a,i)=>a+i.qty,0),0);
  const low = products.filter(p=>p.stock>0&&p.stock<=p.alertAt).length;
  const out = products.filter(p=>p.stock===0).length;
  const allRev = transactions.reduce((s,t)=>s+t.total,0);

  $('dashStats').innerHTML = [
    { l:'ยอดขายวันนี้',   v: fmt(todayAmt),      s:`${todayTx.length} รายการ`,  c:'var(--success)' },
    { l:'ชิ้นที่ขายวันนี้', v: fmtN(todayQty),    s:'ชิ้น',                      c:'var(--accent)' },
    { l:'สินค้าใกล้หมด',  v: low,                 s:'รายการ',                   c:'var(--warning)' },
    { l:'สินค้าหมดสต็อก', v: out,                 s:'รายการ',                   c:'var(--danger)' },
    { l:'สินค้าทั้งหมด',  v: products.length,     s:'รายการ',                   c:'var(--info)' },
    { l:'รายได้รวม',      v: fmt(allRev),          s:'ทุกรายการ',                c:'var(--success)' },
  ].map(s=>`<div class="stat-card"><div class="stat-lbl">${s.l}</div><div class="stat-val" style="color:${s.c}">${s.v}</div><div class="stat-sub">${s.s}</div></div>`).join('');

  const hours = Array.from({length:10},(_,i)=>({ h:`${i+8}`, v: Math.floor(Math.random()*900+100) }));
  const max = Math.max(...hours.map(h=>h.v));
  $('hourlyChart').innerHTML = hours.map(h=>`<div class="bar-row">
    <span class="bar-lbl">${h.h}:00</span>
    <div class="bar-bg"><div class="bar-fill" style="width:${(h.v/max*100).toFixed(1)}%"></div></div>
    <span class="bar-val">${fmt(h.v)}</span>
  </div>`).join('');
}

// ── History ──
function renderHistory() {
  if (!transactions.length) {
    $('histList').innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">ยังไม่มีรายการ</div>';
    return;
  }
  $('histList').innerHTML = transactions.map(t=>{
    const names = t.items.map(i=>i.emoji+i.name).join(', ');
    const qty = t.items.reduce((s,i)=>s+i.qty,0);
    return `<div class="hist-card" onclick="openTxReceipt('${t.id}')">
      <div><div class="hc-num">${t.id}</div><div class="hc-time">${new Date(t.date).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</div></div>
      <div class="hc-info">
        <div class="hc-items">${names}</div>
        <div class="hc-count">${qty} ชิ้น</div>
      </div>
      <div class="hc-right">
        <div class="hc-total">${fmt(t.total)}</div>
        <span class="method-tag ${t.method==='Cash'?'mc':'mq'}">${t.method==='Cash'?'💵':'📲'}</span>
      </div>
    </div>`;
  }).join('');
}

// ── Low Stock ──
function checkLow() {
  const n = products.filter(p=>p.stock===0||p.stock<=p.alertAt).length;
  const el = $('alertBadge');
  el.style.display = n ? 'inline' : 'none';
  el.textContent = `⚠ ${n}`;
}

// ── Sheet helpers ──
function openSheet(id) { $(id).classList.add('active'); }
function closeSheet(id) { $(id).classList.remove('active'); }

// ── View Switch ──
function switchView(v) {
  ['pos','products','history','dashboard'].forEach(n => {
    const el = $('view-'+n);
    el.classList.toggle('active', n === v);
  });
  document.querySelectorAll('.nav-item, .top-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === v);
  });
  if (v === 'dashboard') renderDash();
  if (v === 'products') renderProdList();
  if (v === 'history') renderHistory();
}

// ── Keyboard ──
document.addEventListener('keydown', e => {
  if (e.key==='/'&&document.activeElement.tagName!=='INPUT') { e.preventDefault(); $('searchInput').focus(); }
  if (e.key==='Escape') {
    document.querySelectorAll('.overlay.active').forEach(el=>el.classList.remove('active'));
    document.activeElement.blur();
  }
});

// ── Clock ──
setInterval(() => { $('clock').textContent = new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}); }, 1000);

// ── Init ──
renderCats();
renderGrid();
renderCart();
checkLow();
$('clock').textContent = new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
