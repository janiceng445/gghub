// ══════════════════════════════════════════════
// NAVIGATION & MODALS
// ══════════════════════════════════════════════

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .sidebar-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(name + '-page').classList.add('active');
  
  const nb = document.getElementById('nav-' + name);
  const sb = document.getElementById('sb-' + name);
  if (nb) nb.classList.add('active');
  if (sb) sb.classList.add('active');
  
  if (name === 'recipe') renderRecipes();
  if (name === 'gas') { renderSavedCar(); loadSavedCar(); }
  
  // Scroll to top when navigating to a new page
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  } catch (e) {
    // no-op
  }
}

function toggleSidebar() {
  const open = document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open', open);
  document.getElementById('hamburger').classList.toggle('open', open);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}

// ══════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { 
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

function switchTab(tabId, modalId) {
  const modal = document.getElementById(modalId);
  modal.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  modal.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  
  modal.querySelectorAll('.modal-tab').forEach(b => {
    if (b.getAttribute('onclick').includes(tabId)) b.classList.add('active');
  });
}

// ══════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════════════

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ══════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════

function selectAll(el) { 
  setTimeout(() => el.select(), 0); 
}

function clearField(id) {
  const el = document.getElementById(id);
  el.value = '';
  el.dispatchEvent(new Event('input'));
  el.focus();
}
