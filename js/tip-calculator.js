// ══════════════════════════════════════════════
// TIP CALCULATOR
// ══════════════════════════════════════════════

let tipPct = 10;

function handleCurrencyInput(el) {
  let raw = el.value.replace(/[^0-9]/g, '');
  if (raw === '') { el.value = ''; calcTip(); return; }
  const cents = parseInt(raw, 10);
  const dollars = (cents / 100).toFixed(2);
  el.value = dollars;
  setTimeout(() => { el.selectionStart = el.selectionEnd = el.value.length; }, 0);
  calcTip();
}

function handleCustomTip(el) {
  let raw = el.value.replace(/[^0-9.]/g, '');
  el.value = raw;
  if (raw !== '') {
    const v = parseFloat(raw);
    if (!isNaN(v)) {
      document.querySelectorAll('.pct-pill').forEach(p => p.classList.remove('selected'));
      tipPct = v;
      calcTip();
    }
  }
}

function toggleCustomField(el) {
  const group = document.getElementById('custom-tip-group');
  const isOpen = group.style.display !== 'none';
  if (isOpen) {
    group.style.display = 'none';
    el.classList.remove('selected');
    document.getElementById('custom-tip').value = '';
    tipPct = 10;
    document.querySelector('.pct-pill:not(#custom-pill)').classList.add('selected');
    calcTip();
  } else {
    document.querySelectorAll('.pct-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    group.style.display = 'block';
    setTimeout(() => document.getElementById('custom-tip').focus(), 50);
  }
}

function selectPct(el, pct) {
  document.querySelectorAll('.pct-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  tipPct = pct;
  document.getElementById('custom-tip-group').style.display = 'none';
  document.getElementById('custom-tip').value = '';
  calcTip();
}

function calcTip() {
  const bill = parseFloat(document.getElementById('bill-amount').value) || 0;
  const tip = bill * (tipPct / 100);
  const total = bill + tip;

  document.getElementById('res-tip-amt').textContent = '$' + tip.toFixed(2);
  document.getElementById('res-total').textContent = '$' + total.toFixed(2);

  const show = bill > 0;
  document.getElementById('tip-result').classList.toggle('visible', show);

  if (show) {
    // Round down
    const rdTotal = Math.floor(total);
    const rdTip = rdTotal - bill;
    const rdDiff = total - rdTotal;
    const rdPct = bill > 0 ? (rdTip / bill * 100) : 0;

    document.getElementById('rd-total').textContent = '$' + rdTotal.toFixed(2);
    document.getElementById('rd-badge').textContent = '▼ −$' + rdDiff.toFixed(2);
    document.getElementById('rd-tip-pct').textContent = rdPct.toFixed(1) + '%';
    document.getElementById('rd-tip-amt').textContent = '$' + Math.max(0, rdTip).toFixed(2);

    // Round up
    const ruTotal = Math.ceil(total);
    const ruTip = ruTotal - bill;
    const ruDiff = ruTotal - total;
    const ruPct = bill > 0 ? (ruTip / bill * 100) : 0;

    document.getElementById('ru-total').textContent = '$' + ruTotal.toFixed(2);
    document.getElementById('ru-badge').textContent = '▲ +$' + ruDiff.toFixed(2);
    document.getElementById('ru-tip-pct').textContent = ruPct.toFixed(1) + '%';
    document.getElementById('ru-tip-amt').textContent = '$' + ruTip.toFixed(2);
  }
}
