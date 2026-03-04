// ══════════════════════════════════════════════
// RECIPE BOOK
// ══════════════════════════════════════════════

let recipes = JSON.parse(localStorage.getItem('recipes') || '[]');
let currentRecipe = null;
let currentServings = 4;
let baseServings = 4;
let currentUnit = 'us';
let aiGeneratedRecipe = null;

// Photo management
let photoMultiSelectMode = false;
let selectedPhotos = new Set();

function saveRecipes() { 
  localStorage.setItem('recipes', JSON.stringify(recipes)); 
}

function renderRecipes() {
  const search = (document.getElementById('recipe-search').value || '').toLowerCase();
  const grid = document.getElementById('recipe-grid');
  const empty = document.getElementById('recipe-empty');
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search) || (r.category || '').toLowerCase().includes(search));
  
  grid.innerHTML = '';
  if (filtered.length === 0) { 
    empty.style.display = 'block'; 
    grid.style.display = 'none'; 
    return; 
  }
  
  empty.style.display = 'none'; 
  grid.style.display = 'grid';
  
  filtered.forEach(r => {
    const el = document.createElement('div');
    el.className = 'recipe-card';
    el.onclick = () => openRecipe(r.id);
    
    const imgHtml = r.photos && r.photos.length > 0
      ? `<img src="${r.photos[r.photos.length - 1].data}" alt="">`
      : (r.emoji || '🍽️');
    
    el.innerHTML = `
      <div class="recipe-card-img">${imgHtml}</div>
      <div class="recipe-card-body">
        <div class="recipe-card-title">${r.name}</div>
        <div class="recipe-card-meta">
          <span>⏱ ${r.time || '?'} min</span>
          <span>👤 ${r.servings || 4}</span>
        </div>
        <span class="recipe-tag">${r.category || 'Other'}</span>
      </div>
    `;
    grid.appendChild(el);
  });
}

function openRecipe(id) {
  currentRecipe = recipes.find(r => r.id === id);
  if (!currentRecipe) return;
  
  photoMultiSelectMode = false;
  selectedPhotos.clear();
  baseServings = currentRecipe.servings || 4;
  currentServings = baseServings;
  currentUnit = 'us';

  document.getElementById('detail-title').textContent = currentRecipe.name;
  document.getElementById('detail-time').textContent = '⏱ ' + (currentRecipe.time || '?') + ' min';
  document.getElementById('detail-category').textContent = '🏷 ' + (currentRecipe.category || 'Other');
  document.getElementById('detail-emoji').textContent = currentRecipe.emoji || '🍽️';
  document.getElementById('detail-emoji').style.display = 'flex';

  const heroImg = document.getElementById('detail-hero-img');
  if (currentRecipe.photos && currentRecipe.photos.length > 0) {
    heroImg.src = currentRecipe.photos[currentRecipe.photos.length - 1].data;
    heroImg.style.display = 'block';
    document.getElementById('detail-emoji').style.display = 'none';
  } else {
    heroImg.style.display = 'none';
  }

  updateServingsLabel();
  document.getElementById('unit-us').classList.toggle('active', currentUnit === 'us');
  document.getElementById('unit-metric').classList.toggle('active', currentUnit === 'metric');
  renderIngredients();
  renderInstructions();
  renderPhotos();
  switchTab('tab-ingredients', 'recipe-detail-modal');
  openModal('recipe-detail-modal');
}

function updateServingsLabel() {
  document.getElementById('cur-servings').textContent = currentServings;
  document.getElementById('detail-servings-label').textContent = '👤 ' + currentServings + ' servings';
}

function adjustServings(delta) {
  currentServings = Math.max(1, currentServings + delta);
  updateServingsLabel();
  renderIngredients();
}

function setUnit(u) {
  currentUnit = u;
  document.getElementById('unit-us').classList.toggle('active', u === 'us');
  document.getElementById('unit-metric').classList.toggle('active', u === 'metric');
  renderIngredients();
}

const unitConversions = {
  cup: { metric: { unit: 'ml', factor: 240 } },
  cups: { metric: { unit: 'ml', factor: 240 } },
  tbsp: { metric: { unit: 'ml', factor: 15 } },
  tsp: { metric: { unit: 'ml', factor: 5 } },
  oz: { metric: { unit: 'g', factor: 28.35 } },
  lb: { metric: { unit: 'g', factor: 453.6 } },
  lbs: { metric: { unit: 'g', factor: 453.6 } },
};

function convertAmount(amount, unit) {
  if (currentUnit === 'us') return { amount, unit };
  const conv = unitConversions[unit?.toLowerCase()];
  if (!conv) return { amount, unit };
  const converted = (amount * conv.metric.factor).toFixed(0);
  return { amount: parseFloat(converted), unit: conv.metric.unit };
}

function scaleAmount(amount) {
  if (!amount || isNaN(amount)) return amount;
  return Math.round((amount * currentServings / baseServings) * 100) / 100;
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

function capitalizeFirstWord(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderIngredients() {
  if (!currentRecipe) return;
  const list = document.getElementById('ingredients-list');
  list.innerHTML = '';
  
  (currentRecipe.ingredients || []).forEach((ing, i) => {
    const parsed = parseIngredient(ing);
    let scaled = parsed.amount !== null ? scaleAmount(parsed.amount) : null;
    let displayUnit = parsed.unit;
    
    if (scaled !== null && parsed.unit) {
      const conv = convertAmount(scaled, parsed.unit);
      scaled = conv.amount;
      displayUnit = conv.unit;
    }
    
    const displayAmt = scaled !== null ? (scaled + ' ' + displayUnit).trim() : '';
    const ingredientName = capitalizeFirstWord(parsed.name);
    const el = document.createElement('div');
    el.className = 'ingredient-item' + (currentRecipe.checkedIngredients?.includes(i) ? ' checked' : '');
    el.innerHTML = `
      <div class="check-box">${currentRecipe.checkedIngredients?.includes(i) ? '<svg width="12" height="12" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>' : ''}</div>
      ${displayAmt ? `<div class="ingredient-amount">${displayAmt}</div>` : ''}
      <div class="ingredient-name">${ingredientName}</div>
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
  saveRecipes();
  renderIngredients();
}

function clearChecked() {
  if (currentRecipe) { 
    currentRecipe.checkedIngredients = []; 
    saveRecipes(); 
    renderIngredients(); 
  }
}

function toSentenceCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function renderInstructions() {
  if (!currentRecipe) return;
  const list = document.getElementById('instructions-list');
  list.innerHTML = '';
  
  (currentRecipe.instructions || []).forEach((step, i) => {
    const done = currentRecipe.doneSteps?.includes(i);
    const sentenceCaseStep = toSentenceCase(step);
    const el = document.createElement('div');
    el.className = 'step-item' + (done ? ' done' : '');
    el.innerHTML = `
      <div class="step-num">${done ? '✓' : i + 1}</div>
      <div class="step-text">${sentenceCaseStep}</div>
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
  saveRecipes();
  renderInstructions();
}

function clearDone() {
  if (currentRecipe) { 
    currentRecipe.doneSteps = []; 
    saveRecipes(); 
    renderInstructions(); 
  }
}

function renderPhotos() {
  if (!currentRecipe) return;
  const grid = document.getElementById('photo-grid');
  const deleteBtn = document.getElementById('delete-selected-btn');
  grid.innerHTML = '';
  
  // Show/hide delete button based on selection
  deleteBtn.style.display = selectedPhotos.size > 0 ? 'inline-flex' : 'none';
  
  (currentRecipe.photos || []).forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'photo-thumb';
    const isSelected = selectedPhotos.has(i);
    if (isSelected) el.classList.add('photo-thumb-selected');
    
    el.innerHTML = `
      <img src="${p.data}" alt="">
      <div class="photo-thumb-date">${p.date || ''}</div>
      <button class="photo-thumb-delete" title="Delete photo">✕</button>
      ${photoMultiSelectMode ? `<div class="photo-thumb-checkbox"></div>` : ''}
    `;
    
    const deleteBtn = el.querySelector('.photo-thumb-delete');
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (photoMultiSelectMode) {
        togglePhotoSelection(i);
      } else {
        deletePhoto(i);
      }
    };
    
    el.onmousedown = (e) => {
      if (photoMultiSelectMode) {
        togglePhotoSelection(i);
      } else if (e.button === 0) {
        startLongPress(e, i);
      }
    };
    
    el.onmouseup = cancelLongPress;
    el.onmouseleave = cancelLongPress;
    el.ontouchstart = (e) => startLongPress(e, i);
    el.ontouchend = cancelLongPress;
    
    grid.appendChild(el);
  });
}

let longPressTimer = null;
function startLongPress(e, photoIndex) {
  longPressTimer = setTimeout(() => {
    if (!photoMultiSelectMode) {
      photoMultiSelectMode = true;
      selectedPhotos.clear();
      togglePhotoSelection(photoIndex);
      renderPhotos();
      showToast('📸 Multi-select mode');
    }
  }, 500);
}

function cancelLongPress() {
  if (longPressTimer) clearTimeout(longPressTimer);
}

function togglePhotoSelection(i) {
  if (selectedPhotos.has(i)) {
    selectedPhotos.delete(i);
  } else {
    selectedPhotos.add(i);
  }
  if (selectedPhotos.size === 0) {
    photoMultiSelectMode = false;
  }
  renderPhotos();
}

function deletePhoto(i) {
  if (!confirm('Delete this photo?')) return;
  currentRecipe.photos.splice(i, 1);
  saveRecipes();
  renderPhotos();
  renderRecipes();
  showToast('📸 Photo deleted');
}

function deleteSelectedPhotos() {
  if (selectedPhotos.size === 0) return;
  if (!confirm(`Delete ${selectedPhotos.size} photo(s)?`)) return;
  
  const indices = Array.from(selectedPhotos).sort((a, b) => b - a);
  indices.forEach(i => currentRecipe.photos.splice(i, 1));
  
  selectedPhotos.clear();
  photoMultiSelectMode = false;
  saveRecipes();
  renderPhotos();
  renderRecipes();
  showToast(`📸 ${indices.length} photo(s) deleted`);
}

function triggerPhotoUpload() { 
  document.getElementById('photo-input').click(); 
}

let photosToProcess = [];
let processingIndex = 0;

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
    document.getElementById('photo-date-img').src = e.target.result;
    document.getElementById('photo-date-input').value = new Date().toISOString().split('T')[0];
    document.getElementById('photo-date-modal').dataset.currentData = e.target.result;
    openModal('photo-date-modal');
  };
  reader.readAsDataURL(file);
}

function confirmPhotoDate() {
  const data = document.getElementById('photo-date-modal').dataset.currentData;
  const date = document.getElementById('photo-date-input').value;
  
  if (!currentRecipe.photos) currentRecipe.photos = [];
  currentRecipe.photos.push({ data, date });
  saveRecipes();
  renderPhotos();
  closeModal('photo-date-modal');
  
  processingIndex++;
  if (processingIndex < photosToProcess.length) promptNextPhoto();
  else showToast('📷 Photos added!');
}

function populateEditForm(recipe) {
  document.getElementById('edit-recipe-name').value = recipe.name || '';
  document.getElementById('edit-recipe-category').value = recipe.category || 'Other';
  document.getElementById('edit-recipe-time').value = recipe.time || '';
  document.getElementById('edit-recipe-servings').value = recipe.servings || '4';
  document.getElementById('edit-recipe-ingredients').value = (recipe.ingredients || []).join('\n');
  document.getElementById('edit-recipe-instructions').value = (recipe.instructions || []).join('\n');
}

function readEditForm() {
  const name = document.getElementById('edit-recipe-name').value.trim();
  const category = document.getElementById('edit-recipe-category').value;
  const time = parseInt(document.getElementById('edit-recipe-time').value) || 0;
  const servings = parseInt(document.getElementById('edit-recipe-servings').value) || 4;
  const ingredients = document.getElementById('edit-recipe-ingredients').value.trim().split('\n').filter(l => l.trim());
  const instructions = document.getElementById('edit-recipe-instructions').value.trim().split('\n').filter(l => l.trim());
  
  if (!name || !ingredients.length || !instructions.length) {
    showToast('Fill in name, ingredients, and instructions');
    return null;
  }
  
  return {
    id: Date.now().toString(),
    name,
    category,
    time,
    servings,
    emoji: aiGeneratedRecipe?.emoji || '🍽️',
    ingredients,
    instructions,
    photos: [],
    checkedIngredients: [],
    doneSteps: []
  };
}

function saveNewRecipe() {
  const recipe = readEditForm();
  if (!recipe) return;
  
  recipes.unshift(recipe);
  saveRecipes();
  renderRecipes();
  closeModal('new-recipe-modal');
  aiGeneratedRecipe = null;
  document.getElementById('paste-preview').style.display = 'none';
  resetNewRecipeForm();
  showToast('🍽️ Recipe saved!');
}

function resetNewRecipeForm() {
  document.getElementById('paste-recipe-text').value = '';
  document.getElementById('edit-recipe-name').value = '';
  document.getElementById('edit-recipe-category').value = 'Other';
  document.getElementById('edit-recipe-time').value = '';
  document.getElementById('edit-recipe-servings').value = '4';
  document.getElementById('edit-recipe-ingredients').value = '';
  document.getElementById('edit-recipe-instructions').value = '';
  aiGeneratedRecipe = null;
  document.getElementById('paste-preview').style.display = 'none';
}

function deleteCurrentRecipe() {
  if (!currentRecipe) return;
  if (!confirm('Delete "' + currentRecipe.name + '"?')) return;
  recipes = recipes.filter(r => r.id !== currentRecipe.id);
  saveRecipes();
  renderRecipes();
  closeModal('recipe-detail-modal');
  showToast('Recipe deleted');
}

function shareRecipe() {
  if (!currentRecipe) return;
  const text = formatRecipeText(currentRecipe, currentServings);
  document.getElementById('share-content').textContent = text;
  document.getElementById('share-modal-title').textContent = '📤 Share Recipe';
  openModal('share-modal');
}

function shareIngredients() {
  if (!currentRecipe) return;
  let text = `🧂 Ingredients for ${currentRecipe.name}\n`;
  text += `${currentServings} servings (1x serving size from recipe)\n`;
  text += '─'.repeat(40) + '\n\n';
  
  (currentRecipe.ingredients || []).forEach(ing => {
    const parsed = parseIngredient(ing);
    let scaled = parsed.amount !== null ? scaleAmount(parsed.amount) : null;
    let displayUnit = parsed.unit;
    
    if (scaled !== null && parsed.unit) {
      const conv = convertAmount(scaled, parsed.unit);
      scaled = conv.amount;
      displayUnit = conv.unit;
    }
    
    const display = scaled !== null ? `${scaled} ${displayUnit}` : '';
    text += `• ${display ? display + ' ' : ''}${parsed.name}\n`;
  });
  
  document.getElementById('share-content').textContent = text;
  document.getElementById('share-modal-title').textContent = '🧂 Ingredient List';
  openModal('share-modal');
}

function formatRecipePreview(r) {
  let txt = `📖 ${r.name}\n`;
  txt += `🏷 ${r.category || 'Other'} | ⏱ ${r.time || '?'} min | 👤 ${r.servings || 4}\n\n`;
  txt += `🧂 INGREDIENTS:\n`;
  (r.ingredients || []).forEach(ing => {
    txt += `  • ${ing}\n`;
  });
  txt += `\n📝 INSTRUCTIONS:\n`;
  (r.instructions || []).forEach((step, i) => {
    txt += `  ${i + 1}. ${step}\n`;
  });
  return txt;
}

function formatRecipeText(r, servings) {
  const s = servings || r.servings || 4;
  const scale = s / (r.servings || 4);
  let txt = `📖 ${r.name}\n`;
  txt += '─'.repeat(40) + '\n';
  txt += `Category: ${r.category || 'Other'} | Time: ${r.time || '?'} min | Servings: ${s}\n\n`;
  txt += `🧂 INGREDIENTS (${s} servings):\n`;
  (r.ingredients || []).forEach(ing => {
    const p = parseIngredient(ing);
    let amt = p.amount !== null ? Math.round(p.amount * scale * 100) / 100 : null;
    txt += `  • ${amt !== null ? amt + ' ' + p.unit + ' ' : ''}${p.name}\n`;
  });
  txt += '\n📝 INSTRUCTIONS:\n';
  (r.instructions || []).forEach((step, i) => {
    txt += `  ${i + 1}. ${step}\n`;
  });
  txt += '\n─'.repeat(40) + '\nShared from My Recipe Book 🍴';
  return txt;
}

function copyShare() {
  const text = document.getElementById('share-content').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!')).catch(() => showToast('Copy failed'));
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

function importRecipe() { 
  document.getElementById('import-input').click(); 
}

function handleImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const r = JSON.parse(e.target.result);
      r.id = Date.now().toString();
      if (!r.checkedIngredients) r.checkedIngredients = [];
      if (!r.doneSteps) r.doneSteps = [];
      if (!r.photos) r.photos = [];
      recipes.unshift(r);
      saveRecipes();
      renderRecipes();
      showToast('📥 Recipe imported!');
    } catch { 
      showToast('Invalid recipe file'); 
    }
  };
  reader.readAsText(file);
  input.value = '';
}

async function generateAIRecipe() {
  const name = document.getElementById('ai-name').value.trim();
  const servings = document.getElementById('ai-servings').value || '4';
  const ingredText = document.getElementById('ai-ingredients').value.trim();
  const instrText = document.getElementById('ai-instructions').value.trim();
  
  if (!name || !ingredText || !instrText) { 
    showToast('Fill in all 4 fields'); 
    return; 
  }

  let apiKey = localStorage.getItem('geminiApiKey');
  if (!apiKey) {
    apiKey = prompt('Enter your Google Gemini API key (free from https://aistudio.google.com/apikey):\n\nThis will be stored locally on your device.');
    if (!apiKey) return;
    localStorage.setItem('geminiApiKey', apiKey);
    showToast('API key saved locally');
  }

  const btn = document.getElementById('ai-generate-btn');
  const loading = document.getElementById('ai-loading');
  const preview = document.getElementById('ai-preview');

  btn.style.display = 'none';
  loading.style.display = 'flex';
  preview.style.display = 'none';

  try {
    // Get list of available models
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!modelsRes.ok) throw new Error('Failed to fetch available models');
    
    const modelsData = await modelsRes.json();
    const textModel = modelsData.models?.find(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    if (!textModel) throw new Error('No text generation model available');
    
    const modelName = textModel.name.replace('models/', '');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Parse and format this recipe for consistency:

Recipe Name: ${name}
Servings: ${servings}

Ingredients (user provided):
${ingredText}

Instructions (user provided):
${instrText}

Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) in this exact format:
{
  "name": "Recipe Name",
  "category": "Dinner",
  "time": 30,
  "servings": ${servings},
  "emoji": "🍽️",
  "ingredients": ["amount unit ingredient name", "amount ingredient name"],
  "instructions": ["Clear first step", "Clear second step"]
}

Requirements:
- Keep ingredients in format: "amount unit name" (e.g. "2 cups flour")
- Category must be one of: Breakfast, Lunch, Dinner, Snack, Dessert, Drink, Other
- Time: estimate reasonable cook time in minutes
- Emoji: pick ONE relevant food emoji
- ingredients: standardize quantities but maintain user's amounts
- instructions: keep concise, one action per step`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const recipe = JSON.parse(clean);
    recipe.id = Date.now().toString();
    recipe.photos = [];
    recipe.checkedIngredients = [];
    recipe.doneSteps = [];

    aiGeneratedRecipe = recipe;
    document.getElementById('ai-preview-content').textContent = formatRecipePreview(recipe);
    preview.style.display = 'block';

  } catch (err) {
    showToast('Parsing failed: ' + err.message);
    console.error(err);
  } finally {
    btn.style.display = 'inline-flex';
    loading.style.display = 'none';
  }
}

async function parseRecipeFromText() {
  const text = document.getElementById('paste-recipe-text').value.trim();
  if (!text) { 
    showToast('Paste recipe text first'); 
    return; 
  }

  let apiKey = localStorage.getItem('geminiApiKey');
  if (!apiKey) {
    apiKey = prompt('Enter your Google Gemini API key (free from https://aistudio.google.com/apikey):\n\nThis will be stored locally on your device.');
    if (!apiKey) return;
    localStorage.setItem('geminiApiKey', apiKey);
    showToast('API key saved locally');
  }

  const btn = document.getElementById('paste-parse-btn');
  const loading = document.getElementById('paste-loading');
  const preview = document.getElementById('paste-preview');

  btn.style.display = 'none';
  loading.style.display = 'flex';
  preview.style.display = 'none';

  try {
    // Get list of available models and find one that supports generateContent
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!modelsRes.ok) throw new Error('Failed to fetch available models');
    
    const modelsData = await modelsRes.json();
    const textModel = modelsData.models?.find(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    if (!textModel) throw new Error('No text generation model available');
    
    const modelName = textModel.name.replace('models/', '');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract and intelligently parse this recipe text into a structured format:

${text}

Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) in this exact format:
{
  "name": "Recipe Name",
  "category": "Dinner",
  "time": 30,
  "servings": 4,
  "emoji": "🍽️",
  "ingredients": ["amount unit ingredient", "ingredient without amount"],
  "instructions": ["Step one", "Step two", "Step three"]
}

Requirements:
- Extract recipe name from text (if not obvious, use best guess from content)
- Extract or estimate servings (default to 4 if not found)
- ingredients: standardize format as "amount unit ingredient" or just "ingredient"
- instructions: break into clear, numbered steps (no step numbers in text)
- category: one of Breakfast, Lunch, Dinner, Snack, Dessert, Drink, Other
- time: estimate in minutes (15-60 typical range)
- emoji: pick ONE relevant food emoji that best represents the dish`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = responseText.replace(/```json|```/g, '').trim();
    const recipe = JSON.parse(clean);
    recipe.id = Date.now().toString();
    recipe.photos = [];
    recipe.checkedIngredients = [];
    recipe.doneSteps = [];

    aiGeneratedRecipe = recipe;
    populateEditForm(recipe);
    document.getElementById('paste-preview').style.display = 'block';

  } catch (err) {
    showToast('Parse failed: ' + err.message);
    console.error(err);
  } finally {
    btn.style.display = 'inline-flex';
    loading.style.display = 'none';
  }
}

// ── Initialize ──
function initRecipes() {
  renderRecipes();
  if (recipes.length === 0) {
    recipes.push({
      id: '1',
      name: 'Classic Spaghetti Carbonara',
      category: 'Dinner',
      time: 25,
      servings: 4,
      emoji: '🍝',
      ingredients: ['400g spaghetti','200g pancetta','4 eggs','100g Parmesan cheese','2 cloves garlic','Black pepper to taste','Salt for pasta water'],
      instructions: [
        'Bring a large pot of salted water to a boil and cook spaghetti until al dente.',
        'While pasta cooks, fry pancetta and garlic in a large pan over medium heat until crispy.',
        'Whisk eggs and grated Parmesan together in a bowl. Season with black pepper.',
        'Reserve 1 cup of pasta water, then drain pasta.',
        'Remove pan from heat, add pasta and toss with pancetta.',
        'Quickly pour in egg mixture, tossing constantly and adding pasta water to create a creamy sauce.',
        'Serve immediately with extra Parmesan and cracked pepper.'
      ],
      photos: [],
      checkedIngredients: [],
      doneSteps: []
    });
    saveRecipes();
    renderRecipes();
  }
}
