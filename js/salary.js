// ══════════════════════════════════════════════
// SALARY BREAKDOWN & COST CALCULATOR
// ══════════════════════════════════════════════

const HOURS_PER_WEEK = 40;
const WEEKS_PER_YEAR = 52;
const HOURS_PER_DAY  = 8;
const STANDARD_DEDUCTION = 14600; // 2024 federal standard deduction

const STATES = [
  { code: 'AL', name: 'Alabama',          rate: 0.05   },
  { code: 'AK', name: 'Alaska',           rate: 0      },
  { code: 'AZ', name: 'Arizona',          rate: 0.025  },
  { code: 'AR', name: 'Arkansas',         rate: 0.044  },
  { code: 'CA', name: 'California',       rate: 0.093  },
  { code: 'CO', name: 'Colorado',         rate: 0.044  },
  { code: 'CT', name: 'Connecticut',      rate: 0.065  },
  { code: 'DE', name: 'Delaware',         rate: 0.066  },
  { code: 'FL', name: 'Florida',          rate: 0      },
  { code: 'GA', name: 'Georgia',          rate: 0.0549 },
  { code: 'HI', name: 'Hawaii',           rate: 0.08   },
  { code: 'ID', name: 'Idaho',            rate: 0.058  },
  { code: 'IL', name: 'Illinois',         rate: 0.0495 },
  { code: 'IN', name: 'Indiana',          rate: 0.0305 },
  { code: 'IA', name: 'Iowa',             rate: 0.057  },
  { code: 'KS', name: 'Kansas',           rate: 0.057  },
  { code: 'KY', name: 'Kentucky',         rate: 0.045  },
  { code: 'LA', name: 'Louisiana',        rate: 0.06   },
  { code: 'ME', name: 'Maine',            rate: 0.0715 },
  { code: 'MD', name: 'Maryland',         rate: 0.0575 },
  { code: 'MA', name: 'Massachusetts',    rate: 0.05   },
  { code: 'MI', name: 'Michigan',         rate: 0.0425 },
  { code: 'MN', name: 'Minnesota',        rate: 0.0985 },
  { code: 'MS', name: 'Mississippi',      rate: 0.05   },
  { code: 'MO', name: 'Missouri',         rate: 0.048  },
  { code: 'MT', name: 'Montana',          rate: 0.059  },
  { code: 'NE', name: 'Nebraska',         rate: 0.0684 },
  { code: 'NV', name: 'Nevada',           rate: 0      },
  { code: 'NH', name: 'New Hampshire',    rate: 0      },
  { code: 'NJ', name: 'New Jersey',       rate: 0.0637 },
  { code: 'NM', name: 'New Mexico',       rate: 0.059  },
  { code: 'NY', name: 'New York',         rate: 0.0685 },
  { code: 'NC', name: 'North Carolina',   rate: 0.045  },
  { code: 'ND', name: 'North Dakota',     rate: 0.025  },
  { code: 'OH', name: 'Ohio',             rate: 0.035  },
  { code: 'OK', name: 'Oklahoma',         rate: 0.0475 },
  { code: 'OR', name: 'Oregon',           rate: 0.099  },
  { code: 'PA', name: 'Pennsylvania',     rate: 0.0307 },
  { code: 'RI', name: 'Rhode Island',     rate: 0.0599 },
  { code: 'SC', name: 'South Carolina',   rate: 0.065  },
  { code: 'SD', name: 'South Dakota',     rate: 0      },
  { code: 'TN', name: 'Tennessee',        rate: 0      },
  { code: 'TX', name: 'Texas',            rate: 0      },
  { code: 'UT', name: 'Utah',             rate: 0.0465 },
  { code: 'VT', name: 'Vermont',          rate: 0.0875 },
  { code: 'VA', name: 'Virginia',         rate: 0.0575 },
  { code: 'WA', name: 'Washington',       rate: 0      },
  { code: 'DC', name: 'Washington D.C.',  rate: 0.0925 },
  { code: 'WV', name: 'West Virginia',    rate: 0.065  },
  { code: 'WI', name: 'Wisconsin',        rate: 0.0765 },
  { code: 'WY', name: 'Wyoming',          rate: 0      },
];

let salaryMode  = 'hourly';
let salaryValue = 0; // always stored as annual

// ── Init ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  populateStates();
  loadFromStorage();
});

function populateStates() {
  const select = document.getElementById('state-select');
  STATES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.code;
    opt.textContent = s.rate === 0 ? `${s.name} (no income tax)` : s.name;
    select.appendChild(opt);
  });
}

// ── Mode toggle ──────────────────────────────

function setMode(mode) {
  if (salaryMode === mode) return;
  salaryMode = mode;

  document.querySelectorAll('.toggle-pill').forEach(p => p.classList.remove('selected'));
  document.querySelector(`.toggle-pill[data-mode="${mode}"]`).classList.add('selected');

  const label = document.getElementById('salary-label');
  if (label) label.textContent = mode === 'hourly' ? 'Hourly rate' : 'Annual salary';

  const input = document.getElementById('salary-input');
  if (input) {
    input.placeholder = mode === 'hourly' ? '0.00' : '0';
    if (salaryValue > 0) {
      input.value = mode === 'hourly'
        ? (salaryValue / (HOURS_PER_WEEK * WEEKS_PER_YEAR)).toFixed(2)
        : Math.round(salaryValue).toString();
    }
  }

  saveToStorage();
}

// ── Salary input ─────────────────────────────

function handleSalaryInput(el) {
  let raw = el.value.replace(/[^0-9.]/g, '');
  // Keep only one decimal point
  const dot = raw.indexOf('.');
  if (dot !== -1) raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, '');
  el.value = raw;

  const num = parseFloat(raw) || 0;
  salaryValue = salaryMode === 'hourly'
    ? num * HOURS_PER_WEEK * WEEKS_PER_YEAR
    : num;

  saveToStorage();

  const breakdownCard = document.getElementById('breakdown-card');
  const costCard      = document.getElementById('cost-card');

  if (salaryValue <= 0) {
    breakdownCard.style.display = 'none';
    costCard.style.display      = 'none';
    return;
  }

  breakdownCard.style.display = 'block';
  costCard.style.display      = 'block';
  updateBreakdown();
  updateCostCalc();
}

function clearSalary() {
  const input = document.getElementById('salary-input');
  input.value = '';
  input.focus();
  salaryValue = 0;
  saveToStorage();
  document.getElementById('breakdown-card').style.display = 'none';
  document.getElementById('cost-card').style.display      = 'none';
}

// ── State selector ───────────────────────────

function handleStateChange() {
  const state = document.getElementById('state-select').value;
  localStorage.setItem('gg_salary_state', state);

  const section = document.getElementById('takehome-section');
  if (!state || salaryValue <= 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  updateTakeHome();
}

// ── Cost input ───────────────────────────────

function handleCostInput(el) {
  let raw = el.value.replace(/[^0-9.]/g, '');
  const dot = raw.indexOf('.');
  if (dot !== -1) raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, '');
  el.value = raw;

  const cost   = parseFloat(raw) || 0;
  const result = document.getElementById('cost-result');

  if (cost <= 0 || salaryValue <= 0) {
    result.style.display = 'none';
    return;
  }

  result.style.display = 'block';
  renderCostResult(cost);
}

function clearCost() {
  const input = document.getElementById('cost-input');
  input.value = '';
  input.focus();
  document.getElementById('cost-result').style.display = 'none';
}

// ── Breakdown update ─────────────────────────

function updateBreakdown() {
  const hourly  = salaryValue / (HOURS_PER_WEEK * WEEKS_PER_YEAR);
  const weekly  = hourly * HOURS_PER_WEEK;
  const monthly = salaryValue / 12;

  document.getElementById('val-hourly').textContent  = fmtCurrency(hourly);
  document.getElementById('val-weekly').textContent  = fmtCurrency(weekly);
  document.getElementById('val-monthly').textContent = fmtCurrency(monthly);
  document.getElementById('val-annual').textContent  = fmtCurrency(salaryValue, 0);

  const state = document.getElementById('state-select').value;
  if (state) updateTakeHome();
}

function updateTakeHome() {
  const stateCode = document.getElementById('state-select').value;
  if (!stateCode) return;

  const federal  = calcFederalTax(salaryValue);
  const fica     = calcFICA(salaryValue);
  const stateTax = calcStateTax(salaryValue, stateCode);
  const annualTH = Math.max(0, salaryValue - federal - fica - stateTax);
  const monthlyTH = annualTH / 12;

  document.getElementById('val-federal-tax').textContent = fmtCurrency(federal, 0) + '/yr';
  document.getElementById('val-fica').textContent        = fmtCurrency(fica, 0) + '/yr';
  document.getElementById('val-state-tax').textContent   = fmtCurrency(stateTax, 0) + '/yr';
  document.getElementById('val-takehome-monthly').textContent = fmtCurrency(monthlyTH, 0);
  document.getElementById('val-takehome-annual').textContent  = fmtCurrency(annualTH, 0);
}

// ── Cost calc update ─────────────────────────

function updateCostCalc() {
  const input = document.getElementById('cost-input');
  if (!input || !input.value) return;
  const cost = parseFloat(input.value) || 0;
  if (cost <= 0 || salaryValue <= 0) {
    document.getElementById('cost-result').style.display = 'none';
    return;
  }
  document.getElementById('cost-result').style.display = 'block';
  renderCostResult(cost);
}

function renderCostResult(cost) {
  const hourly  = salaryValue / (HOURS_PER_WEEK * WEEKS_PER_YEAR);
  const minutes = (cost / hourly) * 60;
  const hours   = cost / hourly;
  const days    = hours / HOURS_PER_DAY;

  document.getElementById('val-minutes').textContent = fmtMinutes(minutes);
  document.getElementById('val-hours').textContent   = fmtHours(hours);
  document.getElementById('val-days').textContent    = fmtDays(days);

  const badge = document.getElementById('worth-it-badge');
  let label, cls;

  if (minutes < 30) {
    label = 'Easy buy';       cls = 'worth-easy';
  } else if (minutes < 120) {
    label = 'Small treat';    cls = 'worth-small';
  } else if (minutes < 480) {
    label = 'Think about it'; cls = 'worth-think';
  } else {
    label = 'Big purchase';   cls = 'worth-big';
  }

  badge.textContent = label;
  badge.className   = 'worth-it-badge ' + cls;
}

// ── Tax calculations ──────────────────────────

function calcFederalTax(income) {
  const taxable = Math.max(0, income - STANDARD_DEDUCTION);
  // 2024 single-filer brackets
  const brackets = [
    [11600,   0.10],
    [47150,   0.12],
    [100525,  0.22],
    [191950,  0.24],
    [243725,  0.32],
    [609350,  0.35],
    [Infinity, 0.37],
  ];
  let tax = 0, prev = 0;
  for (const [limit, rate] of brackets) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, limit) - prev) * rate;
    prev = limit;
    if (taxable <= limit) break;
  }
  return tax;
}

function calcFICA(income) {
  const ss       = Math.min(income, 168600) * 0.062; // SS wage base 2024
  const medicare = income * 0.0145;
  return ss + medicare;
}

function calcStateTax(income, stateCode) {
  const s = STATES.find(x => x.code === stateCode);
  return s ? income * s.rate : 0;
}

// ── Formatting ────────────────────────────────

function fmtCurrency(n, decimals = 2) {
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtMinutes(m) {
  if (m < 1)   return '< 1';
  if (m < 10)  return m.toFixed(1);
  if (m < 100) return Math.round(m).toString();
  return Math.round(m).toLocaleString();
}

function fmtHours(h) {
  if (h < 10)  return h.toFixed(2);
  if (h < 100) return h.toFixed(1);
  return h.toFixed(0);
}

function fmtDays(d) {
  if (d < 0.01) return '< 0.01';
  return d.toFixed(2);
}

// ── Storage ───────────────────────────────────

function saveToStorage() {
  localStorage.setItem('gg_salary_mode',  salaryMode);
  localStorage.setItem('gg_salary_value', salaryValue.toString());
}

function loadFromStorage() {
  const mode  = localStorage.getItem('gg_salary_mode')  || 'hourly';
  const annual = parseFloat(localStorage.getItem('gg_salary_value')) || 0;
  const state = localStorage.getItem('gg_salary_state') || '';

  salaryMode = mode;

  document.querySelectorAll('.toggle-pill').forEach(p => p.classList.remove('selected'));
  const pill = document.querySelector(`.toggle-pill[data-mode="${mode}"]`);
  if (pill) pill.classList.add('selected');

  const label = document.getElementById('salary-label');
  if (label) label.textContent = mode === 'hourly' ? 'Hourly rate' : 'Annual salary';

  if (annual > 0) {
    salaryValue = annual;
    const input = document.getElementById('salary-input');
    if (input) {
      input.value = mode === 'hourly'
        ? (annual / (HOURS_PER_WEEK * WEEKS_PER_YEAR)).toFixed(2)
        : Math.round(annual).toString();
    }
    document.getElementById('breakdown-card').style.display = 'block';
    document.getElementById('cost-card').style.display      = 'block';
    updateBreakdown();
  }

  if (state) {
    const sel = document.getElementById('state-select');
    if (sel) sel.value = state;
    if (annual > 0) {
      document.getElementById('takehome-section').style.display = 'block';
      updateTakeHome();
    }
  }
}
