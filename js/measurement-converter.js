// ══════════════════════════════════════════════
// MEASUREMENT CONVERTER
// ══════════════════════════════════════════════

const UNITS = [
  { key: 'tsp',   label: 'tsp',   full: 'Teaspoon',    ml: 4.92892, weight: false },
  { key: 'tbsp',  label: 'tbsp',  full: 'Tablespoon',  ml: 14.7868, weight: false },
  { key: 'floz',  label: 'fl oz', full: 'Fluid Ounce', ml: 29.5735, weight: false },
  { key: 'cup',   label: 'cup',   full: 'Cup',         ml: 236.588, weight: false },
  { key: 'pint',  label: 'pt',    full: 'Pint',        ml: 473.176, weight: false },
  { key: 'quart', label: 'qt',    full: 'Quart',       ml: 946.353, weight: false },
  { key: 'ml',    label: 'ml',    full: 'Milliliter',  ml: 1,       weight: false },
  { key: 'l',     label: 'L',     full: 'Liter',       ml: 1000,    weight: false },
  { key: 'g',     label: 'g',     full: 'Gram',        ml: null,    weight: true  },
];

// Density in g/ml for common cooking ingredients (alphabetical)
const INGREDIENTS = [
  { key: 'flour_ap',    label: 'All-purpose flour', gPerMl: 0.529 },
  { key: 'flour_alm',  label: 'Almond flour',       gPerMl: 0.406 },
  { key: 'baking_pwd', label: 'Baking powder',      gPerMl: 0.921 },
  { key: 'baking_soda',label: 'Baking soda',        gPerMl: 0.963 },
  { key: 'flour_bread', label: 'Bread flour',       gPerMl: 0.550 },
  { key: 'sugar_br',   label: 'Brown sugar',        gPerMl: 0.930 },
  { key: 'butter',     label: 'Butter',             gPerMl: 0.959 },
  { key: 'flour_cake',  label: 'Cake flour',        gPerMl: 0.423 },
  { key: 'cocoa',      label: 'Cocoa powder',       gPerMl: 0.359 },
  { key: 'flour_coc',  label: 'Coconut flour',      gPerMl: 0.422 },
  { key: 'cornstarch', label: 'Cornstarch',         gPerMl: 0.541 },
  { key: 'cream',      label: 'Heavy cream',        gPerMl: 1.012 },
  { key: 'honey',      label: 'Honey',              gPerMl: 1.420 },
  { key: 'maple',      label: 'Maple syrup',        gPerMl: 1.370 },
  { key: 'milk',       label: 'Milk',               gPerMl: 1.030 },
  { key: 'oil_olive',  label: 'Olive oil',          gPerMl: 0.908 },
  { key: 'sugar_pow',  label: 'Powdered sugar',     gPerMl: 0.507 },
  { key: 'rice',       label: 'Rice (uncooked)',    gPerMl: 0.782 },
  { key: 'flour_rice', label: 'Rice flour',         gPerMl: 0.637 },
  { key: 'oats',       label: 'Rolled oats',        gPerMl: 0.338 },
  { key: 'salt',       label: 'Salt (table)',       gPerMl: 1.218 },
  { key: 'oil_veg',    label: 'Vegetable oil',      gPerMl: 0.915 },
  { key: 'water',      label: 'Water',              gPerMl: 1.000 },
  { key: 'sugar',      label: 'White sugar',        gPerMl: 0.845 },
  { key: 'flour_ww',   label: 'Whole wheat flour',  gPerMl: 0.507 },
];

let fromKey        = 'tbsp';
let toKey          = 'tsp';
let ingredientKey  = null;
let pickerTarget   = 'from';

function getUnit(key)       { return UNITS.find(u => u.key === key); }
function getIngredient(key) { return INGREDIENTS.find(i => i.key === key); }

function needsDensity() {
  return getUnit(fromKey).weight !== getUnit(toKey).weight;
}

function updateLabels() {
  document.getElementById('from-label').textContent = getUnit(fromKey).label;
  document.getElementById('to-label').textContent   = getUnit(toKey).label;
}

function formatNum(n) {
  if (n === 0) return '0';
  if (Math.abs(n) < 0.001) return parseFloat(n.toPrecision(3)).toString();
  return parseFloat(n.toPrecision(5)).toString();
}

function updateResult() {
  const rawStr  = document.getElementById('conv-input').value;
  const raw     = parseFloat(rawStr);
  const result  = document.getElementById('conv-result');
  const ingBtn  = document.getElementById('ingredient-btn');

  // Show/hide ingredient picker based on whether density is needed
  const densityNeeded = needsDensity();
  ingBtn.style.display = densityNeeded ? 'inline-flex' : 'none';

  if (rawStr === '' || isNaN(raw)) {
    result.textContent = '';
    result.classList.remove('conv-result--error');
    return;
  }

  if (densityNeeded) {
    const ing = ingredientKey ? getIngredient(ingredientKey) : null;
    if (!ing) {
      result.textContent = '← Select an ingredient';
      result.classList.add('conv-result--error');
      return;
    }
    result.classList.remove('conv-result--error');

    const fromUnit = getUnit(fromKey);
    const toUnit   = getUnit(toKey);

    let converted;
    if (!fromUnit.weight && toUnit.weight) {
      // volume → grams: ml * gPerMl = g
      const ml = raw * fromUnit.ml;
      converted = ml * ing.gPerMl;
    } else {
      // grams → volume: g / gPerMl = ml, then ml / toUnit.ml
      const ml = raw / ing.gPerMl;
      converted = ml / toUnit.ml;
    }
    result.textContent = formatNum(converted) + ' ' + toUnit.label;
  } else {
    result.classList.remove('conv-result--error');
    const fromUnit = getUnit(fromKey);
    const toUnit   = getUnit(toKey);
    const converted = (raw * fromUnit.ml) / toUnit.ml;
    result.textContent = formatNum(converted) + ' ' + toUnit.label;
  }
}

function swapUnits() {
  [fromKey, toKey] = [toKey, fromKey];
  updateLabels();
  updateResult();
}

// ── Unit picker ──
function openPicker(target) {
  pickerTarget = target;
  const activeKey = target === 'from' ? fromKey : toKey;
  document.getElementById('picker-title').textContent = target === 'from' ? 'Convert from…' : 'Convert to…';

  const grid = document.getElementById('picker-grid');
  grid.innerHTML = '';
  grid.classList.remove('picker-grid--ingredients');
  UNITS.forEach(u => {
    const btn = document.createElement('button');
    btn.className = 'picker-unit-btn' + (u.key === activeKey ? ' active' : '');
    btn.innerHTML = `<span class="pu-label">${u.label}</span><span class="pu-full">${u.full}</span>`;
    btn.onclick = () => selectUnit(u.key);
    grid.appendChild(btn);
  });

  document.getElementById('picker-overlay').classList.add('open');
}

function closePicker() {
  document.getElementById('picker-overlay').classList.remove('open');
}

function selectUnit(key) {
  if (pickerTarget === 'from') {
    fromKey = key;
    if (fromKey === toKey) toKey = UNITS.find(u => u.key !== key).key;
  } else {
    toKey = key;
    if (toKey === fromKey) fromKey = UNITS.find(u => u.key !== key).key;
  }
  updateLabels();
  updateResult();
  closePicker();
}

// ── Ingredient picker ──
function openIngredientPicker() {
  pickerTarget = 'ingredient';
  document.getElementById('picker-title').textContent = 'Select ingredient';

  const grid = document.getElementById('picker-grid');
  grid.innerHTML = '';
  grid.classList.add('picker-grid--ingredients');
  INGREDIENTS.forEach(ing => {
    const btn = document.createElement('button');
    btn.className = 'picker-unit-btn picker-ing-btn' + (ing.key === ingredientKey ? ' active' : '');
    btn.innerHTML = `<span class="pu-label">${ing.label}</span>`;
    btn.onclick = () => selectIngredient(ing.key);
    grid.appendChild(btn);
  });

  document.getElementById('picker-overlay').classList.add('open');
}

function selectIngredient(key) {
  ingredientKey = key;
  document.getElementById('ingredient-label').textContent = getIngredient(key).label;
  updateResult();
  closePicker();
}

// ── Distance ──
const DIST_UNITS = [
  { key: 'mm', label: 'mm', full: 'Millimeter', m: 0.001     },
  { key: 'cm', label: 'cm', full: 'Centimeter', m: 0.01      },
  { key: 'm',  label: 'm',  full: 'Meter',      m: 1         },
  { key: 'km', label: 'km', full: 'Kilometer',  m: 1000      },
  { key: 'in', label: 'in', full: 'Inch',       m: 0.0254    },
  { key: 'ft', label: 'ft', full: 'Foot',       m: 0.3048    },
  { key: 'yd', label: 'yd', full: 'Yard',       m: 0.9144    },
  { key: 'mi', label: 'mi', full: 'Mile',       m: 1609.344  },
];

let distFromKey = 'cm';
let distToKey   = 'in';

function getDistUnit(key) { return DIST_UNITS.find(u => u.key === key); }

function updateDistLabels() {
  document.getElementById('dist-from-label').textContent = getDistUnit(distFromKey).label;
  document.getElementById('dist-to-label').textContent   = getDistUnit(distToKey).label;
}

function updateDistResult() {
  const rawStr = document.getElementById('dist-input').value;
  const raw    = parseFloat(rawStr);
  const result = document.getElementById('dist-result');
  if (rawStr === '' || isNaN(raw)) { result.textContent = ''; return; }
  const converted = (raw * getDistUnit(distFromKey).m) / getDistUnit(distToKey).m;
  result.textContent = formatNum(converted) + ' ' + getDistUnit(distToKey).label;
}

function swapDistUnits() {
  [distFromKey, distToKey] = [distToKey, distFromKey];
  updateDistLabels();
  updateDistResult();
}

function openDistPicker(target) {
  pickerTarget = target;
  const activeKey = target === 'dist-from' ? distFromKey : distToKey;
  document.getElementById('picker-title').textContent = target === 'dist-from' ? 'Convert from…' : 'Convert to…';
  const grid = document.getElementById('picker-grid');
  grid.innerHTML = '';
  grid.classList.remove('picker-grid--ingredients');
  DIST_UNITS.forEach(u => {
    const btn = document.createElement('button');
    btn.className = 'picker-unit-btn' + (u.key === activeKey ? ' active' : '');
    btn.innerHTML = `<span class="pu-label">${u.label}</span><span class="pu-full">${u.full}</span>`;
    btn.onclick = () => selectDistUnit(u.key);
    grid.appendChild(btn);
  });
  document.getElementById('picker-overlay').classList.add('open');
}

function selectDistUnit(key) {
  if (pickerTarget === 'dist-from') {
    distFromKey = key;
    if (distFromKey === distToKey) distToKey = DIST_UNITS.find(u => u.key !== key).key;
  } else {
    distToKey = key;
    if (distToKey === distFromKey) distFromKey = DIST_UNITS.find(u => u.key !== key).key;
  }
  updateDistLabels();
  updateDistResult();
  closePicker();
}

// ── Temperature ──
function tempFromF() {
  const val = document.getElementById('temp-f').value;
  const f = parseFloat(val);
  const cEl = document.getElementById('temp-c');
  if (val === '' || isNaN(f)) { cEl.value = ''; return; }
  cEl.value = formatNum((f - 32) * 5 / 9);
}

function tempFromC() {
  const val = document.getElementById('temp-c').value;
  const c = parseFloat(val);
  const fEl = document.getElementById('temp-f');
  if (val === '' || isNaN(c)) { fEl.value = ''; return; }
  fEl.value = formatNum(c * 9 / 5 + 32);
}

// ── Tab switching ──
function setConverterTab(tab) {
  ['temp', 'distance', 'volume'].forEach(t => {
    document.getElementById('conv-section-' + t).style.display = t === tab ? '' : 'none';
    document.querySelector(`.conv-tab[data-tab="${t}"]`).classList.toggle('active', t === tab);
  });
}

document.addEventListener('DOMContentLoaded', () => { updateLabels(); updateDistLabels(); });
