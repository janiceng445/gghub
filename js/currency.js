// ══════════════════════════════════════════════
// CURRENCY CONVERTER
// ══════════════════════════════════════════════

const CURRENCIES = [
  { code: 'USD', symbol: '$',    name: 'US Dollar' },
  { code: 'EUR', symbol: '€',    name: 'Euro' },
  { code: 'GBP', symbol: '£',    name: 'British Pound' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr',   name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$',  name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real' },
  { code: 'CZK', symbol: 'Kč',   name: 'Czech Koruna' },
  { code: 'DKK', symbol: 'kr',   name: 'Danish Krone' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar' },
  { code: 'HUF', symbol: 'Ft',   name: 'Hungarian Forint' },
  { code: 'IDR', symbol: 'Rp',   name: 'Indonesian Rupiah' },
  { code: 'ILS', symbol: '₪',    name: 'Israeli Shekel' },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won' },
  { code: 'MYR', symbol: 'RM',   name: 'Malaysian Ringgit' },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone' },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar' },
  { code: 'PHP', symbol: '₱',    name: 'Philippine Peso' },
  { code: 'PLN', symbol: 'zł',   name: 'Polish Zloty' },
  { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar' },
  { code: 'THB', symbol: '฿',    name: 'Thai Baht' },
  { code: 'TRY', symbol: '₺',    name: 'Turkish Lira' },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand' },
];

const LOCKED = 'USD'; // always in grid, cannot be removed
let favCodes = JSON.parse(localStorage.getItem('cx-favs') || 'null') || [LOCKED, 'EUR'];

const SAVED = JSON.parse(localStorage.getItem('cx-selection') || '{}');
let fromCode     = SAVED.from || 'USD';
let toCode       = SAVED.to   || 'EUR';
let pickerTarget = 'from';
let rateCache    = {};
let dragSrc          = null;
let dropInsertBefore = true;
let dropLine         = null;

function initDropLine() {
  dropLine = document.createElement('div');
  dropLine.className = 'cx-drop-line';
  document.body.appendChild(dropLine);
}

function showDropLine(btn, before) {
  const rect = btn.getBoundingClientRect();
  const x    = before ? rect.left - 1 : rect.right - 1;
  dropLine.style.left    = x + 'px';
  dropLine.style.top     = (rect.top - 2) + 'px';
  dropLine.style.height  = (rect.height + 4) + 'px';
  dropLine.style.display = 'block';
}

function hideDropLine() {
  if (dropLine) dropLine.style.display = 'none';
}

function saveSelection() {
  localStorage.setItem('cx-selection', JSON.stringify({ from: fromCode, to: toCode }));
}

function saveFavs() {
  localStorage.setItem('cx-favs', JSON.stringify(favCodes));
}

function resetIfActive(code) {
  if (fromCode === code) { fromCode = LOCKED; }
  if (toCode === code)   { toCode = favCodes.find(c => c !== fromCode) || LOCKED; }
  saveSelection();
}

function getCurrency(code) { return CURRENCIES.find(c => c.code === code); }
function getCacheKey(from, to) { return `${from}_${to}`; }

async function getRate(from, to) {
  if (from === to) return 1;
  const key = getCacheKey(from, to);
  if (rateCache[key]) return rateCache[key].rate;
  const res  = await fetch(`https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`);
  const data = await res.json();
  const rate = data.rates[to];
  rateCache[key] = { rate, date: data.date };
  return rate;
}

async function convert() {
  const raw    = document.getElementById('cx-input').value.trim();
  const amount = parseFloat(raw);
  const result = document.getElementById('cx-result');
  const rateEl = document.getElementById('cx-rate');
  const wrap   = document.getElementById('cx-result-wrap');

  if (!raw || isNaN(amount)) {
    result.textContent = '';
    rateEl.textContent = '';
    wrap.classList.remove('visible');
    return;
  }
  wrap.classList.add('visible');

  result.textContent = '…';
  try {
    const rate      = await getRate(fromCode, toCode);
    const converted = amount * rate;
    const toCur     = getCurrency(toCode);
    result.textContent = `${toCur.symbol} ${formatAmount(converted, toCode)}`;

    const key     = getCacheKey(fromCode, toCode);
    const date    = rateCache[key]?.date || '';
    const fromCur = getCurrency(fromCode);
    rateEl.textContent = `${fromCur.symbol}1 = ${toCur.symbol}${formatAmount(rate, toCode)}${date ? ' · ' + date : ''}`;
  } catch {
    result.textContent = '';
    rateEl.textContent = 'Could not fetch rate';
  }
}

function formatAmount(amount, code) {
  const decimals = ['JPY', 'KRW', 'IDR', 'HUF'].includes(code) ? 0 : 2;
  return new Intl.NumberFormat('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
}

function swapCurrencies() {
  [fromCode, toCode] = [toCode, fromCode];
  saveSelection();
  renderGrids();
  updateSymbol();
  convert();
}

function updateSymbol() {
  document.getElementById('input-symbol').textContent = getCurrency(fromCode).symbol;
}

// ── Trash zone ──

function showTrash() { document.getElementById('cx-trash').classList.add('visible'); }
function hideTrash() {
  const el = document.getElementById('cx-trash');
  el.classList.remove('visible', 'over');
}

function initTrash() {
  const trash = document.getElementById('cx-trash');
  trash.addEventListener('dragover', e => {
    if (!dragSrc) return;
    e.preventDefault();
    trash.classList.add('over');
  });
  trash.addEventListener('dragleave', () => trash.classList.remove('over'));
  trash.addEventListener('drop', e => {
    e.preventDefault();
    if (!dragSrc || dragSrc.code === LOCKED) return;
    const removed = dragSrc.code;
    favCodes = favCodes.filter(c => c !== removed);
    saveFavs();
    resetIfActive(removed);
    renderGrids();
    updateSymbol();
    convert();
    hideTrash();
  });
}

// ── Inline grids ──

function renderGrids() {
  renderGrid('from-grid', fromCode, code => {
    fromCode = code;
    saveSelection();
    renderGrids();
    updateSymbol();
    convert();
  });
  renderGrid('to-grid', toCode, code => {
    toCode = code;
    saveSelection();
    renderGrids();
    convert();
  });
}

function renderGrid(containerId, activeCode, onSelect) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  // Show favorited currencies; append activeCode if it's not favorited
  const codes = [...favCodes];
  if (!codes.includes(activeCode)) codes.push(activeCode);

  codes.forEach(code => {
    const isFav    = favCodes.includes(code);
    const isLocked = code === LOCKED;
    const cur      = getCurrency(code);
    const btn      = document.createElement('button');
    btn.className  = 'cx-grid-btn' + (code === activeCode ? ' active' : '') + (isFav ? ' draggable' : '');
    btn.innerHTML  = `<span class="cx-grid-sym">${cur.symbol}</span><span class="cx-grid-code">${cur.code}</span>`;

    btn.addEventListener('click', () => onSelect(code));

    if (isFav) {
      btn.draggable = true;
      btn.addEventListener('dragstart', e => {
        dragSrc = { code, containerId };
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => btn.classList.add('cx-dragging'), 0);
        if (!isLocked) showTrash();
      });
      btn.addEventListener('dragend', () => {
        btn.classList.remove('cx-dragging');
        hideDropLine();
        hideTrash();
      });
      btn.addEventListener('dragover', e => {
        if (dragSrc?.containerId !== containerId || dragSrc.code === code) return;
        e.preventDefault();
        dropInsertBefore = e.clientX < btn.getBoundingClientRect().left + btn.offsetWidth / 2;
        showDropLine(btn, dropInsertBefore);
      });
      btn.addEventListener('dragleave', () => hideDropLine());
      btn.addEventListener('drop', e => {
        e.preventDefault();
        hideDropLine();
        if (!dragSrc || dragSrc.code === code || dragSrc.containerId !== containerId) return;
        const fi = favCodes.indexOf(dragSrc.code);
        if (fi === -1 || !favCodes.includes(code)) return;
        const arr = [...favCodes];
        arr.splice(fi, 1);
        const newTi = arr.indexOf(code);
        arr.splice(dropInsertBefore ? newTi : newTi + 1, 0, dragSrc.code);
        favCodes = arr;
        saveFavs();
        renderGrids();
      });
    }

    grid.appendChild(btn);
  });
}

// ── Picker ──

function openMore(target) {
  pickerTarget = target;
  document.getElementById('cx-picker-title').textContent = target === 'from' ? 'From currency' : 'To currency';
  document.getElementById('cx-picker-search').value = '';
  renderMoreList(CURRENCIES);
  document.getElementById('cx-picker-overlay').classList.add('open');
  setTimeout(() => document.getElementById('cx-picker-search').focus(), 300);
}

function closePicker() {
  document.getElementById('cx-picker-overlay').classList.remove('open');
}

function filterMore() {
  const q = document.getElementById('cx-picker-search').value.toLowerCase();
  const list = q
    ? CURRENCIES.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    : CURRENCIES;
  renderMoreList(list);
}

function selectCurrency(code) {
  if (pickerTarget === 'from') fromCode = code;
  else toCode = code;
  if (!favCodes.includes(code)) {
    favCodes = [...favCodes, code];
    saveFavs();
  }
  saveSelection();
  renderGrids();
  updateSymbol();
  convert();
  closePicker();
}

function renderMoreList(list) {
  const active    = pickerTarget === 'from' ? fromCode : toCode;
  const container = document.getElementById('cx-more-list');
  container.innerHTML = '';
  list.forEach(c => {
    const item = document.createElement('div');
    item.className = 'cx-picker-item' + (c.code === active ? ' active' : '');
    item.innerHTML = `<span class="cx-pi-sym">${c.symbol}</span><span class="cx-pi-code">${c.code}</span><span class="cx-pi-name">${c.name}</span>`;
    item.addEventListener('click', () => selectCurrency(c.code));
    container.appendChild(item);
  });
}

// ── Init ──
initDropLine();
initTrash();
renderGrids();
