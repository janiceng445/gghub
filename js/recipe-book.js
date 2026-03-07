// ══════════════════════════════════════════════
// RECIPE BOOK
// ══════════════════════════════════════════════

// ── Firebase ──
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── Globals ──
let recipes             = [];
let currentRecipe       = null;
let currentServings     = 4;
let baseServings        = 4;
let currentUnit         = 'us';
let newRecipePhotos     = [];  // {url, date} — Cloudinary URL, staged before save
let newRecipeCoverIndex = 0;

// ── Firestore helpers ──
function saveRecipe(recipe) {
  db.collection('recipes').doc(recipe.id).set(recipe).catch(console.error);
}

// ── Cloudinary ──
const CLOUDINARY_CLOUD_NAME    = 'dygj7tb8v';
const CLOUDINARY_UPLOAD_PRESET = 'gghub-recipebook';

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

// ══════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════

// ── Sort & search ──
let recipeSort = localStorage.getItem('recipe-sort') || 'recent';

function setRecipeSort(sort) {
  recipeSort = sort;
  localStorage.setItem('recipe-sort', sort);
  document.getElementById('sort-recent')?.classList.toggle('active', sort === 'recent');
  document.getElementById('sort-alpha')?.classList.toggle('active',  sort === 'alpha');
  renderRecipes();
}

function handleSearchInput() {
  renderRecipes();
  const val     = document.getElementById('recipe-search')?.value || '';
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
}

function clearSearch() {
  const input = document.getElementById('recipe-search');
  if (input) input.value = '';
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
  renderRecipes();
}

function renderRecipes() {
  const search = (document.getElementById('recipe-search')?.value || '').toLowerCase();
  const grid   = document.getElementById('recipe-grid');
  const empty  = document.getElementById('recipe-empty');

  if (!grid) return;

  // Apply active state to sort buttons
  document.getElementById('sort-recent')?.classList.toggle('active', recipeSort === 'recent');
  document.getElementById('sort-alpha')?.classList.toggle('active',  recipeSort === 'alpha');

  let filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search) || (r.category || '').toLowerCase().includes(search)
  );

  if (recipeSort === 'alpha') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }

  grid.innerHTML = '';
  if (filtered.length === 0) {
    if (empty) empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }

  if (empty) empty.style.display = 'none';
  grid.style.display = 'grid';

  filtered.forEach(r => {
    const el = document.createElement('div');
    el.className = 'recipe-card';
    el.onclick = () => openRecipe(r.id);

    const coverIdx = r.coverPhotoIndex ?? 0;
    const coverPhoto = r.photos?.[coverIdx] || r.photos?.[0];
    const imgHtml = coverPhoto
      ? `<img src="${coverPhoto.url || coverPhoto.data}" alt="">`
      : (r.emoji || '🍽️');

    el.innerHTML = `
      <div class="recipe-card-img">${imgHtml}</div>
      <div class="recipe-card-body">
        <div class="recipe-card-title">${r.name}</div>
        <div class="recipe-card-meta">
          <span>⏱ ${r.time || '?'} min</span>
          <span>👤 ${r.servings || 4}</span>
        </div>
      </div>
    `;
    grid.appendChild(el);
  });
}

function openRecipe(id) {
  currentRecipe = recipes.find(r => r.id === id);
  if (!currentRecipe) return;

  baseServings    = currentRecipe.servings || 4;
  currentServings = baseServings;
  currentUnit     = 'us';

  document.getElementById('detail-title').textContent = currentRecipe.name;
  document.getElementById('detail-time').textContent  = '⏱ ' + (currentRecipe.time || '?') + ' min';
  document.getElementById('detail-emoji').textContent = currentRecipe.emoji || '🍽️';
  document.getElementById('detail-emoji').style.display = 'flex';

  const heroImg = document.getElementById('detail-hero-img');
  if (currentRecipe.photos && currentRecipe.photos.length > 0) {
    const coverIdx   = currentRecipe.coverPhotoIndex ?? 0;
    const coverPhoto = currentRecipe.photos[coverIdx] || currentRecipe.photos[0];
    heroImg.src = coverPhoto.url || coverPhoto.data;
    heroImg.style.display = 'block';
    document.getElementById('detail-emoji').style.display = 'none';
  } else {
    heroImg.style.display = 'none';
  }

  updateServingsLabel();
  const unitUs     = document.getElementById('unit-us');
  const unitMetric = document.getElementById('unit-metric');
  if (unitUs)     unitUs.classList.toggle('active',     currentUnit === 'us');
  if (unitMetric) unitMetric.classList.toggle('active', currentUnit === 'metric');

  renderIngredients();
  renderInstructions();
  renderPhotos();

  switchTab('tab-ingredients', 'recipe-detail-modal');
  openModal('recipe-detail-modal');
}

// ══════════════════════════════════════════════
// SERVINGS & UNITS
// ══════════════════════════════════════════════

function updateServingsLabel() {
  const servingsLabel = document.getElementById('cur-servings');
  const detailLabel   = document.getElementById('detail-servings-label');
  if (servingsLabel) servingsLabel.textContent = currentServings;
  if (detailLabel)   detailLabel.textContent   = '👤 ' + currentServings + ' servings';
}

function adjustServings(delta) {
  currentServings = Math.max(1, currentServings + delta);
  updateServingsLabel();
  renderIngredients();
}

function setUnit(u) {
  currentUnit = u;
  const unitUs     = document.getElementById('unit-us');
  const unitMetric = document.getElementById('unit-metric');
  if (unitUs)     unitUs.classList.toggle('active',     u === 'us');
  if (unitMetric) unitMetric.classList.toggle('active', u === 'metric');
  renderIngredients();
}

const unitConversions = {
  cup:  { metric: { unit: 'ml', factor: 240    } },
  cups: { metric: { unit: 'ml', factor: 240    } },
  tbsp: { metric: { unit: 'ml', factor: 15     } },
  tsp:  { metric: { unit: 'ml', factor: 5      } },
  oz:   { metric: { unit: 'g',  factor: 28.35  } },
  lb:   { metric: { unit: 'g',  factor: 453.6  } },
  lbs:  { metric: { unit: 'g',  factor: 453.6  } },
};

function convertAmount(amount, unit) {
  if (currentUnit === 'us') return { amount, unit };
  const conv = unitConversions[unit?.toLowerCase()];
  if (!conv) return { amount, unit };
  return { amount: parseFloat((amount * conv.metric.factor).toFixed(0)), unit: conv.metric.unit };
}

function parseIngredient(line) {
  const match = line.match(/^([\d\/.]+)\s*([a-zA-Z]*)\s+(.+)$/);
  if (match) {
    let amt = match[1];
    if (amt.includes('/')) {
      const parts = amt.split('/');
      amt = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
      amt = parseFloat(amt);
    }
    return { amount: amt, unit: match[2] || '', name: match[3] };
  }
  return { amount: null, unit: '', name: line };
}

function scaleAmount(amount) {
  if (!amount || isNaN(amount)) return amount;
  return Math.round((amount * currentServings / baseServings) * 100) / 100;
}

// ══════════════════════════════════════════════
// INGREDIENTS
// ══════════════════════════════════════════════

function renderIngredients() {
  if (!currentRecipe) return;
  const list = document.getElementById('ingredients-list');
  if (!list) return;
  const clearBtn = document.getElementById('clear-checks-btn');
  if (clearBtn) clearBtn.style.display = (currentRecipe.checkedIngredients?.length > 0) ? '' : 'none';

  list.innerHTML = '';
  (currentRecipe.ingredients || []).forEach((ing, i) => {
    const parsed = parseIngredient(ing);
    let scaled = parsed.amount !== null ? scaleAmount(parsed.amount) : null;
    let displayUnit = parsed.unit;

    if (scaled !== null && parsed.unit) {
      const conv = convertAmount(scaled, parsed.unit);
      scaled      = conv.amount;
      displayUnit = conv.unit;
    }

    const displayAmt = scaled !== null ? (scaled + ' ' + displayUnit).trim() : '';
    const isChecked  = currentRecipe.checkedIngredients?.includes(i);

    const el = document.createElement('div');
    el.className = 'ingredient-item' + (isChecked ? ' checked' : '');
    el.innerHTML = `
      <div class="check-box">${isChecked ? '<svg width="12" height="12" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>' : ''}</div>
      ${displayAmt ? `<div class="ingredient-amount">${displayAmt}</div>` : ''}
      <div class="ingredient-name">${parsed.name}</div>
    `;
    el.onclick = () => toggleIngredient(i, el);
    list.appendChild(el);
  });
}

function toggleIngredient(i, el) {
  if (!currentRecipe.checkedIngredients) currentRecipe.checkedIngredients = [];
  const idx = currentRecipe.checkedIngredients.indexOf(i);
  if (idx > -1) currentRecipe.checkedIngredients.splice(idx, 1);
  else currentRecipe.checkedIngredients.push(i);
  saveRecipe(currentRecipe);
  renderIngredients();
}

function copyIngredients() {
  if (!currentRecipe) return;
  let text = '';
  (currentRecipe.ingredients || []).forEach(ing => {
    const parsed = parseIngredient(ing);
    let scaled = parsed.amount !== null ? scaleAmount(parsed.amount) : null;
    let displayUnit = parsed.unit;
    if (scaled !== null && parsed.unit) {
      const conv = convertAmount(scaled, parsed.unit);
      scaled      = conv.amount;
      displayUnit = conv.unit;
    }
    const amt = scaled !== null ? (scaled + ' ' + displayUnit).trim() + ' ' : '';
    text += `• ${amt}${parsed.name}\n`;
  });
  navigator.clipboard.writeText(text)
    .then(() => showToast('Ingredients copied!'))
    .catch(() => showToast('Copy failed'));
}

function clearChecked() {
  if (currentRecipe) {
    currentRecipe.checkedIngredients = [];
    saveRecipe(currentRecipe);
    renderIngredients();
  }
}

// ══════════════════════════════════════════════
// INSTRUCTIONS
// ══════════════════════════════════════════════

function renderInstructions() {
  if (!currentRecipe) return;
  const list = document.getElementById('instructions-list');
  if (!list) return;
  const resetBtn = document.getElementById('reset-steps-btn');
  if (resetBtn) resetBtn.style.display = (currentRecipe.doneSteps?.length > 0) ? '' : 'none';

  list.innerHTML = '';
  if (!currentRecipe.instructions?.length) {
    list.innerHTML = '<p style="color:var(--text2);font-size:0.85rem;font-style:italic;padding:8px 0">No instructions were provided for this recipe.</p>';
    return;
  }
  (currentRecipe.instructions || []).forEach((step, i) => {
    const done = currentRecipe.doneSteps?.includes(i);
    const el   = document.createElement('div');
    el.className = 'step-item' + (done ? ' done' : '');
    el.innerHTML = `
      <div class="step-num">${done ? '✓' : i + 1}</div>
      <div class="step-text">${step}</div>
    `;
    el.onclick = () => toggleStep(i);
    list.appendChild(el);
  });
}

function toggleStep(i) {
  if (!currentRecipe.doneSteps) currentRecipe.doneSteps = [];
  const idx = currentRecipe.doneSteps.indexOf(i);
  if (idx > -1) currentRecipe.doneSteps.splice(idx, 1);
  else currentRecipe.doneSteps.push(i);
  saveRecipe(currentRecipe);
  renderInstructions();
}

function clearDone() {
  if (currentRecipe) {
    currentRecipe.doneSteps = [];
    saveRecipe(currentRecipe);
    renderInstructions();
  }
}

// ══════════════════════════════════════════════
// PHOTOS
// ══════════════════════════════════════════════

function renderPhotos() {
  if (!currentRecipe) return;
  const grid = document.getElementById('photo-grid');
  if (!grid) return;

  const coverIdx = currentRecipe.coverPhotoIndex ?? 0;

  grid.innerHTML = '';
  (currentRecipe.photos || []).forEach((p, i) => {
    const isCover = i === coverIdx && currentRecipe.photos.length > 0;
    const el = document.createElement('div');
    el.className = 'photo-thumb' + (isCover ? ' cover-photo' : '');
    el.innerHTML = `
      <img src="${p.url || p.data}" alt="">
      ${p.date ? `<div class="photo-thumb-date">${p.date}</div>` : ''}
      ${isCover ? '<div class="cover-badge">★ Cover</div>' : ''}
    `;
    el.onclick = () => openPhotoViewer(i);
    grid.appendChild(el);
  });
}

// ── Fullscreen photo viewer ──
let photoViewerIndex = 0;

let _pvTouchStartX = 0;
function _pvTouchStart(e) { _pvTouchStartX = e.touches[0].clientX; }
function _pvTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - _pvTouchStartX;
  if (Math.abs(dx) > 40) photoViewerNav(dx < 0 ? 1 : -1);
}

function openPhotoViewer(index) {
  photoViewerIndex = index;
  updatePhotoViewer();
  const el = document.getElementById('photo-viewer');
  el.style.display = 'flex';
  el.addEventListener('touchstart', _pvTouchStart, { passive: true });
  el.addEventListener('touchend', _pvTouchEnd, { passive: true });
}

function closePhotoViewer() {
  const el = document.getElementById('photo-viewer');
  el.style.display = 'none';
  el.removeEventListener('touchstart', _pvTouchStart);
  el.removeEventListener('touchend', _pvTouchEnd);
}

function updatePhotoViewer() {
  const photos = currentRecipe?.photos || [];
  if (!photos.length) return;
  const p        = photos[photoViewerIndex];
  const isCover  = photoViewerIndex === (currentRecipe.coverPhotoIndex ?? 0);
  const img      = document.getElementById('photo-viewer-img');
  const date     = document.getElementById('photo-viewer-date');
  const coverBtn = document.getElementById('photo-viewer-cover-btn');
  const prevBtn  = document.querySelector('.photo-viewer-prev');
  const nextBtn  = document.querySelector('.photo-viewer-next');
  if (img)      img.src          = p.url || p.data;
  if (date)     date.textContent = p.date || '';
  if (coverBtn) {
    coverBtn.textContent = isCover ? '★ Cover Photo' : '☆ Set as Cover';
    coverBtn.disabled = isCover;
    coverBtn.classList.toggle('is-cover', isCover);
  }
  if (prevBtn)  prevBtn.style.visibility = photos.length > 1 ? 'visible' : 'hidden';
  if (nextBtn)  nextBtn.style.visibility = photos.length > 1 ? 'visible' : 'hidden';
}

function photoViewerNav(dir) {
  const len = currentRecipe?.photos?.length || 1;
  photoViewerIndex = (photoViewerIndex + dir + len) % len;
  updatePhotoViewer();
}

function setViewerCoverPhoto() {
  if (!currentRecipe) return;
  currentRecipe.coverPhotoIndex = photoViewerIndex;
  saveRecipe(currentRecipe);
  updatePhotoViewer();
  renderPhotos();
  // Update hero image too
  const photo   = currentRecipe.photos[photoViewerIndex];
  const heroImg = document.getElementById('detail-hero-img');
  if (photo && heroImg) { heroImg.src = photo.url || photo.data; heroImg.style.display = 'block'; }
}

function setCoverPhoto(index) {
  if (!currentRecipe) return;
  currentRecipe.coverPhotoIndex = index;
  saveRecipe(currentRecipe);

  const photo   = currentRecipe.photos[index];
  const heroImg = document.getElementById('detail-hero-img');
  if (photo && heroImg) {
    heroImg.src = photo.url || photo.data;
    heroImg.style.display = 'block';
    const emoji = document.getElementById('detail-emoji');
    if (emoji) emoji.style.display = 'none';
  }

  renderPhotos();
}

function renderNewRecipePhotos() {
  document.querySelectorAll('.new-recipe-photo-grid').forEach(grid => {
    grid.innerHTML = '';
    newRecipePhotos.forEach((p, i) => {
      const isCover = i === newRecipeCoverIndex;
      const el = document.createElement('div');
      el.className = 'photo-thumb' + (isCover ? ' cover-photo' : '');
      el.title = isCover ? 'Cover photo' : 'Set as cover photo';
      el.innerHTML = `
        <img src="${p.url || p.data}" alt="">
        ${p.date ? `<div class="photo-thumb-date">${p.date}</div>` : ''}
        ${isCover ? '<div class="cover-badge">★ Cover</div>' : ''}
      `;
      el.onclick = () => { newRecipeCoverIndex = i; renderNewRecipePhotos(); };
      grid.appendChild(el);
    });
  });
}

let pendingPhotoFile = null; // file currently being processed in photo-date-modal

// ── Photo upload triggers ──
function triggerPhotoUpload() {
  document.getElementById('photo-input')?.click();
}

function triggerPhotoUploadNewRecipe() {
  document.getElementById('new-recipe-photo-input')?.click();
}

// ── Photo queue for existing recipe ──
let photosToProcess  = [];
let processingIndex  = 0;

function handlePhotoUpload(input) {
  photosToProcess = Array.from(input.files);
  processingIndex = 0;
  if (photosToProcess.length > 0) promptNextPhoto();
  input.value = '';
}

function promptNextPhoto() {
  if (processingIndex >= photosToProcess.length) return;
  const file = photosToProcess[processingIndex];
  pendingPhotoFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const modal = document.getElementById('photo-date-modal');
    if (document.getElementById('photo-date-img')) document.getElementById('photo-date-img').src = e.target.result;
    if (document.getElementById('photo-date-input')) document.getElementById('photo-date-input').value = new Date().toISOString().split('T')[0];
    if (modal) delete modal.dataset.isNewRecipe;
    openModal('photo-date-modal');
  };
  reader.readAsDataURL(file);
}

// ── Photo queue for new recipe ──
let newRecipePhotosToProcess = [];
let newRecipeProcessingIndex = 0;

function handleNewRecipePhotoUpload(input) {
  newRecipePhotosToProcess = Array.from(input.files);
  newRecipeProcessingIndex = 0;
  if (newRecipePhotosToProcess.length > 0) promptNextNewRecipePhoto();
  input.value = '';
}

function promptNextNewRecipePhoto() {
  if (newRecipeProcessingIndex >= newRecipePhotosToProcess.length) return;
  const file = newRecipePhotosToProcess[newRecipeProcessingIndex];
  pendingPhotoFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const modal = document.getElementById('photo-date-modal');
    if (document.getElementById('photo-date-img')) document.getElementById('photo-date-img').src = e.target.result;
    if (document.getElementById('photo-date-input')) document.getElementById('photo-date-input').value = new Date().toISOString().split('T')[0];
    if (modal) modal.dataset.isNewRecipe = 'true';
    openModal('photo-date-modal');
  };
  reader.readAsDataURL(file);
}

// ── Confirm photo date — upload to Cloudinary, store URL in Firestore ──
async function confirmPhotoDate() {
  const modal      = document.getElementById('photo-date-modal');
  const date       = document.getElementById('photo-date-input')?.value || '';
  const confirmBtn = modal?.querySelector('.btn-primary');

  if (!pendingPhotoFile) { closeModal('photo-date-modal'); return; }

  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Uploading…'; }

  let url;
  try {
    url = await uploadToCloudinary(pendingPhotoFile);
  } catch (err) {
    console.error('Upload failed:', err);
    showToast('Upload failed. Try again.');
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Add Photo'; }
    return;
  }

  if (modal?.dataset.isNewRecipe) {
    newRecipePhotos.push({ url, date });
    renderNewRecipePhotos();
    closeModal('photo-date-modal');
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Add Photo'; }
    newRecipeProcessingIndex++;
    if (newRecipeProcessingIndex < newRecipePhotosToProcess.length) promptNextNewRecipePhoto();
    else showToast('📷 Photos added!');
  } else {
    if (!currentRecipe) { closeModal('photo-date-modal'); return; }
    if (!currentRecipe.photos) currentRecipe.photos = [];
    const isFirst = currentRecipe.photos.length === 0;
    currentRecipe.photos.push({ url, date });
    if (isFirst) {
      currentRecipe.coverPhotoIndex = 0;
      const heroImg = document.getElementById('detail-hero-img');
      if (heroImg) { heroImg.src = url; heroImg.style.display = 'block'; }
      const emoji = document.getElementById('detail-emoji');
      if (emoji) emoji.style.display = 'none';
    }
    saveRecipe(currentRecipe);
    renderPhotos();
    closeModal('photo-date-modal');
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Add Photo'; }
    processingIndex++;
    if (processingIndex < photosToProcess.length) promptNextPhoto();
    else showToast('📷 Photos added!');
  }
}

// ══════════════════════════════════════════════
// RECIPE CRUD
// ══════════════════════════════════════════════

function openEditRecipe() {
  if (!currentRecipe) return;
  document.getElementById('edit-name').value         = currentRecipe.name || '';
  document.getElementById('edit-time').value         = currentRecipe.time || '';
  document.getElementById('edit-servings').value     = currentRecipe.servings || 4;
  document.getElementById('edit-emoji').value        = currentRecipe.emoji || '';
  document.getElementById('edit-ingredients').value  = (currentRecipe.ingredients  || []).join('\n');
  document.getElementById('edit-instructions').value = (currentRecipe.instructions || []).join('\n');
  openModal('edit-recipe-modal');
}

async function saveEditRecipe() {
  const name = document.getElementById('edit-name')?.value.trim();
  if (!name) { showToast('Recipe name required'); return; }

  const saveBtn = document.getElementById('edit-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  currentRecipe.name         = name;
  currentRecipe.time         = parseInt(document.getElementById('edit-time')?.value)     || currentRecipe.time;
  currentRecipe.servings     = parseInt(document.getElementById('edit-servings')?.value) || currentRecipe.servings;
  currentRecipe.emoji        = document.getElementById('edit-emoji')?.value              || currentRecipe.emoji;
  currentRecipe.ingredients  = (document.getElementById('edit-ingredients')?.value  || '').split('\n').map(l => l.trim()).filter(Boolean);
  currentRecipe.instructions = (document.getElementById('edit-instructions')?.value || '').split('\n').map(l => l.trim()).filter(Boolean);

  try {
    await db.collection('recipes').doc(currentRecipe.id).set(currentRecipe);
    closeModal('edit-recipe-modal');
    openRecipe(currentRecipe.id);
    showToast('Recipe updated!');
  } catch (err) {
    console.error(err);
    showToast('Save failed');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  }
}

async function deleteCurrentRecipe() {
  if (!currentRecipe) return;
  if (!confirm('Delete "' + currentRecipe.name + '"?')) return;
  try {
    await db.collection('recipes').doc(currentRecipe.id).delete();
    closeModal('edit-recipe-modal');
    closeModal('recipe-detail-modal');
    showToast('Recipe deleted');
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('Delete failed');
  }
}

function shareRecipe() {
  if (!currentRecipe) return;
  const text = formatRecipeText(currentRecipe, currentServings);
  if (navigator.share) {
    navigator.share({ title: currentRecipe.name, text }).catch(() => {});
  } else {
    const content = document.getElementById('share-content');
    if (content) content.textContent = text;
    openModal('share-modal');
  }
}

function formatRecipeText(r, servings) {
  const s     = servings || r.servings || 4;
  const scale = s / (r.servings || 4);
  let txt = `📖 ${r.name}\n`;
  txt += '─'.repeat(40) + '\n';
  txt += `Time: ${r.time || '?'} min | Servings: ${s}\n\n`;
  txt += `🧂 INGREDIENTS (${s} servings):\n`;
  (r.ingredients || []).forEach(ing => {
    const p = parseIngredient(ing);
    const amt = p.amount !== null ? Math.round(p.amount * scale * 100) / 100 : null;
    txt += `  • ${amt !== null ? amt + ' ' + p.unit + ' ' : ''}${p.name}\n`;
  });
  txt += '\n📝 INSTRUCTIONS:\n';
  (r.instructions || []).forEach((step, i) => { txt += `  ${i + 1}. ${step}\n`; });
  txt += '\n─'.repeat(40) + '\nShared from GG.Hub 🍴';
  return txt;
}

function copyShare() {
  const text = document.getElementById('share-content')?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => showToast('Copy failed'));
}

// ── Import ──
function importRecipe() {
  document.getElementById('import-input')?.click();
}

function handleImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const r = JSON.parse(e.target.result);
      r.id = Date.now().toString();
      r.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      if (!r.checkedIngredients) r.checkedIngredients = [];
      if (!r.doneSteps)          r.doneSteps = [];
      if (!r.photos)             r.photos = [];
      await db.collection('recipes').doc(r.id).set(r);
      closeModal('new-recipe-modal');
      showToast('📥 Recipe imported!');
    } catch (err) {
      console.error('Import failed:', err);
      showToast('Invalid recipe file');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

// ══════════════════════════════════════════════
// ASSIST BAR (AI + Scan toggle)
// ══════════════════════════════════════════════

function toggleNrAssist(type) {
  const panels   = { ai: 'nr-panel-ai', scan: 'nr-panel-scan' };
  const btns     = { ai: 'nr-btn-ai',   scan: 'nr-btn-scan'   };
  const panel    = document.getElementById(panels[type]);
  const divider  = document.getElementById('nr-assist-divider');
  if (!panel) return;

  const isOpen = panel.style.display !== 'none';
  // Close both first
  Object.values(panels).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  Object.values(btns).forEach(id   => { const el = document.getElementById(id); if (el) el.classList.remove('active'); });

  if (!isOpen) {
    panel.style.display = 'block';
    document.getElementById(btns[type])?.classList.add('active');
  }
  if (divider) divider.style.display = (!isOpen) ? '' : 'none';
}

function fillFormFromRecipe(recipe) {
  document.getElementById('nr-name').value         = recipe.name     || '';
  document.getElementById('nr-time').value         = recipe.time     || '';
  document.getElementById('nr-servings').value     = recipe.servings || 4;
  document.getElementById('nr-emoji').value        = recipe.emoji    || '';
  document.getElementById('nr-ingredients').value  = (recipe.ingredients  || []).join('\n');
  document.getElementById('nr-instructions').value = (recipe.instructions || []).join('\n');
}

// ══════════════════════════════════════════════
// AI GENERATION
// ══════════════════════════════════════════════

async function generateAIRecipe() {
  const prompt = document.getElementById('ai-prompt')?.value.trim();
  if (!prompt) { showToast('Describe the recipe first'); return; }

  const btn     = document.getElementById('ai-generate-btn');
  const loading = document.getElementById('ai-loading');

  if (btn)     btn.style.display     = 'none';
  if (loading) loading.style.display = 'flex';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text:
            `Generate a recipe based on this request: "${prompt}".

Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) in this exact format:
{
  "name": "Recipe Name",
  "time": 30,
  "servings": 4,
  "emoji": "🍝",
  "ingredients": ["2 cups flour", "3 eggs", "1 tsp salt"],
  "instructions": ["Step one description", "Step two description", "Step three description"]
}

Emoji should be a single relevant food emoji.
ingredients: each as a string like "amount unit ingredient name"
instructions: clear, concise steps`
          }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API error:', JSON.stringify(data));
      throw new Error(data?.error?.message || 'API error');
    }

    const text   = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const recipe = JSON.parse(text);

    fillFormFromRecipe(recipe);
    toggleNrAssist('ai'); // collapse the panel
    showToast('✅ Recipe filled in — review and save!');

  } catch (err) {
    showToast('AI generation failed. Try again.');
    console.error(err);
  } finally {
    if (btn)     btn.style.display     = 'inline-flex';
    if (loading) loading.style.display = 'none';
  }
}

// ══════════════════════════════════════════════
// SCAN FROM IMAGE
// ══════════════════════════════════════════════

let pendingScanFiles = [];

function handleScanImageSelect(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  pendingScanFiles = [...pendingScanFiles, ...files];
  renderScanThumbnails();
  const result = document.getElementById('scan-result');
  if (result) result.style.display = 'none';
  // Reset input so same file can be re-added after clear
  input.value = '';
}

function renderScanThumbnails() {
  const thumbs      = document.getElementById('scan-thumbnails');
  const placeholder = document.getElementById('scan-placeholder');
  const btn         = document.getElementById('scan-btn');
  const clearBtn    = document.getElementById('scan-clear-btn');
  if (!thumbs) return;

  if (!pendingScanFiles.length) {
    thumbs.style.display      = 'none';
    if (placeholder) placeholder.style.display = 'block';
    if (btn)         btn.style.display          = 'none';
    if (clearBtn)    clearBtn.style.display      = 'none';
    return;
  }

  if (placeholder) placeholder.style.display = 'none';
  if (btn)         btn.style.display          = 'inline-flex';
  if (clearBtn)    clearBtn.style.display      = 'inline-flex';
  thumbs.style.display = 'flex';
  thumbs.innerHTML = '';

  pendingScanFiles.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-block';

    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:6px;display:block';
    img.onload = () => URL.revokeObjectURL(url);

    const del = document.createElement('button');
    del.textContent = '✕';
    del.style.cssText = 'position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;line-height:1;cursor:pointer;padding:0';
    del.onclick = e => { e.stopPropagation(); pendingScanFiles.splice(i, 1); renderScanThumbnails(); };

    wrap.appendChild(img);
    wrap.appendChild(del);
    thumbs.appendChild(wrap);
  });

  // Add more button
  const addMore = document.createElement('div');
  addMore.style.cssText = 'width:72px;height:72px;border:2px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);font-size:1.4rem';
  addMore.textContent = '+';
  addMore.title = 'Add more images';
  addMore.onclick = e => { e.stopPropagation(); document.getElementById('scan-photo-input').click(); };
  thumbs.appendChild(addMore);
}

function clearScanImages() {
  pendingScanFiles = [];
  renderScanThumbnails();
  const result = document.getElementById('scan-result');
  if (result) result.style.display = 'none';
}

function compressImageForAI(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataURL   = canvas.toDataURL('image/jpeg', 0.85);
        const base64    = dataURL.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function scanRecipeFromImage() {
  if (!pendingScanFiles.length) { showToast('Upload an image first'); return; }

  const btn      = document.getElementById('scan-btn');
  const clearBtn = document.getElementById('scan-clear-btn');
  const uploadArea = document.getElementById('scan-upload-area');
  const loading  = document.getElementById('scan-loading');
  const result   = document.getElementById('scan-result');

  if (btn)        btn.style.display        = 'none';
  if (clearBtn)   clearBtn.style.display   = 'none';
  if (uploadArea) uploadArea.style.pointerEvents = 'none';
  if (loading)    loading.style.display    = 'flex';
  if (result)     result.style.display     = 'none';

  try {
    const compressed = await Promise.all(pendingScanFiles.map(compressImageForAI));
    const imageParts = compressed.map(({ base64, mimeType }) => ({ inline_data: { mime_type: mimeType, data: base64 } }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              ...imageParts,
              { text:
`This image contains a recipe. Extract it and respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) in this exact format:
{
  "name": "Recipe Name",
  "time": 30,
  "servings": 4,
  "emoji": "🍝",
  "ingredients": ["2 cups flour", "3 eggs", "1 tsp salt"],
  "instructions": ["Step one description", "Step two description"]
}

Rules:
- time: total time in minutes as a number
- servings: number of servings as a number
- emoji: a single relevant food emoji
- ingredients: each as a string like "amount unit ingredient"
- instructions: clear steps as strings
- If any field is unclear from the image, make a reasonable estimate` }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini scan error:', JSON.stringify(data));
      throw new Error(data?.error?.message || 'API error');
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const recipe = JSON.parse(text);

    recipe.checkedIngredients = [];
    recipe.doneSteps          = [];

    fillFormFromRecipe(recipe);
    toggleNrAssist('scan'); // collapse the panel
    showToast('✅ Recipe scanned — review and save!');

  } catch (err) {
    showToast('Scan failed. Try a clearer image.');
    console.error(err);
    if (btn)      btn.style.display      = 'inline-flex';
    if (clearBtn) clearBtn.style.display = 'inline-flex';
  } finally {
    if (loading)    loading.style.display          = 'none';
    if (uploadArea) uploadArea.style.pointerEvents = '';
  }
}

// ── Save new recipe ──
async function saveNewRecipe() {
  const name = document.getElementById('nr-name')?.value.trim() || '';
  if (!name) { showToast('Please enter a recipe name'); return; }

  const saveBtn = document.getElementById('save-recipe-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  const recipeId = Date.now().toString();

  const recipe = {
    id:           recipeId,
    createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
    name,
    time:         parseInt(document.getElementById('nr-time')?.value)     || 30,
    servings:     parseInt(document.getElementById('nr-servings')?.value) || 4,
    emoji:        document.getElementById('nr-emoji')?.value              || '🍽️',
    ingredients:  (document.getElementById('nr-ingredients')?.value  || '').split('\n').map(l => l.trim()).filter(Boolean),
    instructions: (document.getElementById('nr-instructions')?.value || '').split('\n').map(l => l.trim()).filter(Boolean),
    photos:             [...newRecipePhotos],
    coverPhotoIndex:    newRecipeCoverIndex,
    checkedIngredients: [],
    doneSteps:          []
  };

  try {
    await db.collection('recipes').doc(recipeId).set(recipe);
    closeModal('new-recipe-modal');
    showToast('🍽️ Recipe saved!');
  } catch (err) {
    console.error('Save failed:', err);
    showToast('Save failed. Try again.');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Recipe'; }
  }
}

function resetNewRecipeForm() {
  ['nr-name','nr-time','nr-emoji','nr-ingredients','nr-instructions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const servingsInput = document.getElementById('nr-servings');
  if (servingsInput) servingsInput.value = '4';

  newRecipePhotos     = [];
  newRecipeCoverIndex = 0;
  renderNewRecipePhotos();

  // Reset AI panel
  const prompt = document.getElementById('ai-prompt');
  if (prompt) prompt.value = '';

  // Reset scan panel
  pendingScanFiles = [];
  renderScanThumbnails();
  const scanInput = document.getElementById('scan-photo-input');
  if (scanInput) scanInput.value = '';

  // Collapse assist panels
  ['nr-panel-ai','nr-panel-scan'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  ['nr-btn-ai','nr-btn-scan'].forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
  const divider = document.getElementById('nr-assist-divider');
  if (divider) divider.style.display = 'none';
}

// ══════════════════════════════════════════════
// INIT — real-time Firestore listener
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  db.collection('recipes')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderRecipes();
      // Keep currentRecipe in sync if it's open
      if (currentRecipe) {
        const updated = recipes.find(r => r.id === currentRecipe.id);
        if (updated) currentRecipe = updated;
      }
    }, err => {
      console.error('Firestore error:', err);
      showToast('Failed to load recipes');
    });
}, true);
