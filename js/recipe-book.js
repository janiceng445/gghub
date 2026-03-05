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
let aiGeneratedRecipe   = null;
let newRecipePhotos     = [];  // {data, date} — compressed base64, staged before save
let newRecipeCoverIndex = 0;

// ── Firestore helpers ──
function saveRecipe(recipe) {
  db.collection('recipes').doc(recipe.id).set(recipe).catch(console.error);
}

// Compress an image data URL to JPEG (max 1000px wide, quality 0.70)
function compressImage(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 1000;
      let { width, height } = img;
      if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.70));
    };
    img.onerror = () => resolve(dataUrl); // fallback: keep original
    img.src = dataUrl;
  });
}

// ══════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════

function renderRecipes() {
  const search = (document.getElementById('recipe-search')?.value || '').toLowerCase();
  const grid   = document.getElementById('recipe-grid');
  const empty  = document.getElementById('recipe-empty');

  if (!grid) return;

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search) || (r.category || '').toLowerCase().includes(search)
  );

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
    const imgHtml = r.photos && r.photos.length > 0
      ? `<img src="${r.photos[coverIdx]?.data || r.photos[0].data}" alt="">`
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
    const coverIdx = currentRecipe.coverPhotoIndex ?? 0;
    heroImg.src = currentRecipe.photos[coverIdx]?.data || currentRecipe.photos[0].data;
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
      <div class="ingredient-name">${parsed.name}</div>
      ${displayAmt ? `<div class="ingredient-amount">${displayAmt}</div>` : ''}
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

  list.innerHTML = '';
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
    el.title = isCover ? 'Cover photo' : 'Set as cover photo';
    el.innerHTML = `
      <img src="${p.data}" alt="">
      ${p.date ? `<div class="photo-thumb-date">${p.date}</div>` : ''}
      ${isCover ? '<div class="cover-badge">★ Cover</div>' : ''}
    `;
    el.onclick = () => setCoverPhoto(i);
    grid.appendChild(el);
  });
}

function setCoverPhoto(index) {
  if (!currentRecipe) return;
  currentRecipe.coverPhotoIndex = index;
  saveRecipe(currentRecipe);

  const photo   = currentRecipe.photos[index];
  const heroImg = document.getElementById('detail-hero-img');
  if (photo && heroImg) {
    heroImg.src = photo.data;
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
        <img src="${p.data}" alt="">
        ${p.date ? `<div class="photo-thumb-date">${p.date}</div>` : ''}
        ${isCover ? '<div class="cover-badge">★ Cover</div>' : ''}
      `;
      el.onclick = () => { newRecipeCoverIndex = i; renderNewRecipePhotos(); };
      grid.appendChild(el);
    });
  });
}

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
  const reader = new FileReader();
  reader.onload = e => {
    const modal = document.getElementById('photo-date-modal');
    if (document.getElementById('photo-date-img')) document.getElementById('photo-date-img').src = e.target.result;
    if (document.getElementById('photo-date-input')) document.getElementById('photo-date-input').value = new Date().toISOString().split('T')[0];
    if (modal) { modal.dataset.currentData = e.target.result; delete modal.dataset.isNewRecipe; }
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
  const reader = new FileReader();
  reader.onload = e => {
    const modal = document.getElementById('photo-date-modal');
    if (document.getElementById('photo-date-img')) document.getElementById('photo-date-img').src = e.target.result;
    if (document.getElementById('photo-date-input')) document.getElementById('photo-date-input').value = new Date().toISOString().split('T')[0];
    if (modal) { modal.dataset.currentData = e.target.result; modal.dataset.isNewRecipe = 'true'; }
    openModal('photo-date-modal');
  };
  reader.readAsDataURL(file);
}

// ── Confirm photo date — compress then store as base64 in Firestore ──
async function confirmPhotoDate() {
  const modal      = document.getElementById('photo-date-modal');
  const rawData    = modal?.dataset.currentData;
  const date       = document.getElementById('photo-date-input')?.value || '';
  const confirmBtn = modal?.querySelector('.btn-primary');

  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Processing…'; }

  const data = await compressImage(rawData);

  if (modal?.dataset.isNewRecipe) {
    newRecipePhotos.push({ data, date });
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
    currentRecipe.photos.push({ data, date });
    if (isFirst) {
      currentRecipe.coverPhotoIndex = 0;
      const heroImg = document.getElementById('detail-hero-img');
      if (heroImg) { heroImg.src = data; heroImg.style.display = 'block'; }
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

async function deleteCurrentRecipe() {
  if (!currentRecipe) return;
  if (!confirm('Delete "' + currentRecipe.name + '"?')) return;
  try {
    await db.collection('recipes').doc(currentRecipe.id).delete();
    closeModal('recipe-detail-modal');
    showToast('Recipe deleted');
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('Delete failed');
  }
}

function shareRecipe() {
  if (!currentRecipe) return;
  const content = document.getElementById('share-content');
  if (content) content.textContent = formatRecipeText(currentRecipe, currentServings);
  openModal('share-modal');
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
  txt += '\n─'.repeat(40) + '\nShared from GG.Tools 🍴';
  return txt;
}

function copyShare() {
  const text = document.getElementById('share-content')?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => showToast('Copy failed'));
}

function exportRecipe() {
  if (!currentRecipe) return;
  const blob = new Blob([JSON.stringify(currentRecipe, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = currentRecipe.name.replace(/\s+/g, '_') + '.json';
  a.click();
  showToast('📤 Recipe exported!');
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
// AI GENERATION
// ══════════════════════════════════════════════

async function generateAIRecipe() {
  const prompt = document.getElementById('ai-prompt')?.value.trim();
  if (!prompt) { showToast('Describe the recipe first'); return; }

  const btn     = document.getElementById('ai-generate-btn');
  const loading = document.getElementById('ai-loading');
  const preview = document.getElementById('ai-preview');

  if (btn)     btn.style.display     = 'none';
  if (loading) loading.style.display = 'flex';
  if (preview) preview.style.display = 'none';

  const GEMINI_KEY = 'AIzaSyCqYho5TEoYYMKgxbqE07ZzsfDFwmxXRqw';
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

    recipe.checkedIngredients = [];
    recipe.doneSteps          = [];

    aiGeneratedRecipe = recipe;
    const content = document.getElementById('ai-preview-content');
    if (content) content.textContent = formatRecipeText(recipe, recipe.servings);
    if (preview) preview.style.display = 'block';

  } catch (err) {
    showToast('AI generation failed. Try again.');
    console.error(err);
  } finally {
    if (btn)     btn.style.display     = 'inline-flex';
    if (loading) loading.style.display = 'none';
  }
}

// ── Save new recipe ──
async function saveNewRecipe() {
  if (aiGeneratedRecipe) { saveGeneratedRecipe(); return; }

  const name = document.getElementById('nr-name')?.value.trim() || '';
  if (!name) { showToast('Please enter a recipe name'); return; }

  const saveBtn = document.getElementById('save-recipe-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  const recipeId = Date.now().toString();

  const recipe = {
    id:         recipeId,
    createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
    name,
    time:       parseInt(document.getElementById('nr-time')?.value)     || 30,
    servings:   parseInt(document.getElementById('nr-servings')?.value) || 4,
    emoji:      document.getElementById('nr-emoji')?.value              || '🍽️',
    ingredients:  (document.getElementById('nr-ingredients')?.value  || '').split('\n').map(l => l.trim()).filter(Boolean),
    instructions: (document.getElementById('nr-instructions')?.value || '').split('\n').map(l => l.trim()).filter(Boolean),
    photos:               [...newRecipePhotos],
    coverPhotoIndex:      newRecipeCoverIndex,
    checkedIngredients:   [],
    doneSteps:            []
  };

  try {
    await db.collection('recipes').doc(recipeId).set(recipe);
    closeModal('new-recipe-modal');
    resetNewRecipeForm();
    showToast('🍽️ Recipe saved!');
  } catch (err) {
    console.error('Save failed:', err);
    showToast('Save failed. Try again.');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Recipe'; }
  }
}

// ── Save AI-generated recipe ──
async function saveGeneratedRecipe() {
  if (!aiGeneratedRecipe) return;

  const saveBtn = document.getElementById('save-recipe-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  const recipeId = Date.now().toString();

  const recipe = {
    ...aiGeneratedRecipe,
    id:                 recipeId,
    createdAt:          firebase.firestore.FieldValue.serverTimestamp(),
    photos:             [...newRecipePhotos],
    coverPhotoIndex:    newRecipeCoverIndex,
  };

  try {
    await db.collection('recipes').doc(recipeId).set(recipe);
    closeModal('new-recipe-modal');
    aiGeneratedRecipe = null;
    resetNewRecipeForm();
    showToast('🍽️ AI Recipe saved!');
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

  aiGeneratedRecipe  = null;
  newRecipePhotos    = [];
  newRecipeCoverIndex = 0;
  renderNewRecipePhotos();
  const preview = document.getElementById('ai-preview');
  if (preview) preview.style.display = 'none';
  const prompt = document.getElementById('ai-prompt');
  if (prompt) prompt.value = '';
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
