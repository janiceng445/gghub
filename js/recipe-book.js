// ══════════════════════════════════════════════
// RECIPE BOOK
// ══════════════════════════════════════════════

let recipes = JSON.parse(localStorage.getItem('recipes') || '[]');
let currentRecipe = null;
let currentServings = 4;
let baseServings = 4;
let currentUnit = 'us';
let aiGeneratedRecipe = null;

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
      ? `<img src="${r.photos[0].data}" alt="">`
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
    heroImg.src = currentRecipe.photos[0].data;
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
    const el = document.createElement('div');
    el.className = 'ingredient-item' + (currentRecipe.checkedIngredients?.includes(i) ? ' checked' : '');
    el.innerHTML = `
      <div class="check-box">${currentRecipe.checkedIngredients?.includes(i) ? '<svg width="12" height="12" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>' : ''}</div>
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

function renderInstructions() {
  if (!currentRecipe) return;
  const list = document.getElementById('instructions-list');
  list.innerHTML = '';
  
  (currentRecipe.instructions || []).forEach((step, i) => {
    const done = currentRecipe.doneSteps?.includes(i);
    const el = document.createElement('div');
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
  grid.innerHTML = '';
  
  (currentRecipe.photos || []).forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'photo-thumb';
    el.innerHTML = `<img src="${p.data}" alt=""><div class="photo-thumb-date">${p.date || ''}</div>`;
    grid.appendChild(el);
  });
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

function saveNewRecipe() {
  if (aiGeneratedRecipe) {
    saveGeneratedRecipe();
    return;
  }
  
  const name = document.getElementById('nr-name').value.trim();
  if (!name) { showToast('Please enter a recipe name'); return; }
  
  const ingredText = document.getElementById('nr-ingredients').value;
  const instrText = document.getElementById('nr-instructions').value;
  
  const recipe = {
    id: Date.now().toString(),
    name,
    category: document.getElementById('nr-category').value,
    time: parseInt(document.getElementById('nr-time').value) || 30,
    servings: parseInt(document.getElementById('nr-servings').value) || 4,
    emoji: document.getElementById('nr-emoji').value || '🍽️',
    ingredients: ingredText.split('\n').map(l => l.trim()).filter(Boolean),
    instructions: instrText.split('\n').map(l => l.trim()).filter(Boolean),
    photos: [],
    checkedIngredients: [],
    doneSteps: []
  };
  
  recipes.unshift(recipe);
  saveRecipes();
  renderRecipes();
  closeModal('new-recipe-modal');
  resetNewRecipeForm();
  showToast('🍽️ Recipe saved!');
}

function saveGeneratedRecipe() {
  recipes.unshift(aiGeneratedRecipe);
  saveRecipes();
  renderRecipes();
  closeModal('new-recipe-modal');
  aiGeneratedRecipe = null;
  document.getElementById('ai-preview').style.display = 'none';
  document.getElementById('ai-prompt').value = '';
  showToast('🍽️ AI Recipe saved!');
}

function resetNewRecipeForm() {
  ['nr-name','nr-time','nr-emoji','nr-ingredients','nr-instructions'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('nr-servings').value = '4';
  aiGeneratedRecipe = null;
  document.getElementById('ai-preview').style.display = 'none';
  document.getElementById('ai-prompt').value = '';
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
  openModal('share-modal');
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
  const prompt = document.getElementById('ai-prompt').value.trim();
  if (!prompt) { showToast('Describe the recipe first'); return; }

  const btn = document.getElementById('ai-generate-btn');
  const loading = document.getElementById('ai-loading');
  const preview = document.getElementById('ai-preview');

  btn.style.display = 'none';
  loading.style.display = 'flex';
  preview.style.display = 'none';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Generate a recipe based on this request: "${prompt}".
          
Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble) in this exact format:
{
  "name": "Recipe Name",
  "category": "Dinner",
  "time": 30,
  "servings": 4,
  "emoji": "🍝",
  "ingredients": ["2 cups flour", "3 eggs", "1 tsp salt"],
  "instructions": ["Step one description", "Step two description", "Step three description"]
}

Categories must be one of: Breakfast, Lunch, Dinner, Snack, Dessert, Drink, Other.
Emoji should be a single relevant food emoji.
ingredients: each as a string like "amount unit ingredient name"
instructions: clear, concise steps`
        }]
      })
    });

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const recipe = JSON.parse(clean);
    recipe.id = Date.now().toString();
    recipe.photos = [];
    recipe.checkedIngredients = [];
    recipe.doneSteps = [];

    aiGeneratedRecipe = recipe;
    document.getElementById('ai-preview-content').textContent = formatRecipeText(recipe, recipe.servings);
    preview.style.display = 'block';

  } catch (err) {
    showToast('AI generation failed. Try again.');
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
