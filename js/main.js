// ══════════════════════════════════════════════
// NAV INCLUDE
// ══════════════════════════════════════════════

async function initNav() {
  const res = await fetch('nav.html');
  const html = await res.text();
  document.getElementById('nav-placeholder').innerHTML = html;

  // Mark the current page's nav link as active
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-btn').forEach(link => {
    const linkFile = (link.getAttribute('href') || '').split('/').pop();
    if (linkFile && linkFile === currentFile) link.classList.add('active');
  });
}

// ══════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');

  const open = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open);
  overlay && overlay.classList.toggle('open', open);
  hamburger && hamburger.classList.toggle('open', open);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('open');
  const hamburger = document.getElementById('hamburger');
  if (hamburger) hamburger.classList.remove('open');
}

// ══════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

function switchTab(tabId, modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  modal.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('active'));

  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');

  modal.querySelectorAll('.modal-tab').forEach(b => {
    if (b.getAttribute('onclick')?.includes(tabId)) b.classList.add('active');
  });
}

function setupModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

// ══════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════════════

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ══════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════

function selectAll(el) {
  setTimeout(() => el.select(), 0);
}

function clearField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = '';
  el.dispatchEvent(new Event('input'));
  el.focus();
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  setupModals();
});
