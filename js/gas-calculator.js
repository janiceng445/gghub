// ══════════════════════════════════════════════
// GAS CALCULATOR
// ══════════════════════════════════════════════

const carModels = {
  Acura: ['ILX','Integra','MDX','NSX','RDX','RLX','TLX','ZDX'],
  Audi: ['A3','A4','A6','A8','e-tron','Q3','Q5','Q7','RS6'],
  BMW: ['3 Series','5 Series','7 Series','i4','iX','M3','M5','X3','X5','X7'],
  Chevrolet: ['Blazer','Colorado','Equinox','Malibu','Silverado','Suburban','Tahoe','Traverse','Trax'],
  Chrysler: ['300','Pacifica','Voyager'],
  Dodge: ['Challenger','Charger','Durango','Hornet'],
  Ford: ['Bronco','Edge','Escape','Expedition','Explorer','F-150','Maverick','Mustang','Ranger'],
  GMC: ['Acadia','Canyon','Sierra 1500','Terrain','Yukon'],
  Honda: ['Accord','CR-V','Civic','Fit','HR-V','Odyssey','Passport','Pilot','Ridgeline'],
  Hyundai: ['Elantra','Ioniq 5','Ioniq 6','Kona','Palisade','Santa Fe','Sonata','Tucson'],
  Jeep: ['Cherokee','Compass','Gladiator','Grand Cherokee','Renegade','Wrangler'],
  Kia: ['Carnival','EV6','Forte','K5','Soul','Sorento','Sportage','Telluride'],
  Lexus: ['ES','GX','IS','LS','LX','NX','RX','UX'],
  Mazda: ['CX-30','CX-5','CX-50','CX-9','Mazda3','Mazda6','MX-5 Miata'],
  'Mercedes-Benz': ['A-Class','AMG GT','C-Class','CLA','E-Class','GLC','GLE','GLS','S-Class'],
  Nissan: ['Altima','Armada','Frontier','Leaf','Maxima','Murano','Pathfinder','Rogue','Sentra'],
  Ram: ['1500','2500','3500','ProMaster'],
  Subaru: ['Ascent','BRZ','Crosstrek','Forester','Impreza','Legacy','Outback','WRX'],
  Tesla: ['Cybertruck','Model 3','Model S','Model X','Model Y'],
  Toyota: ['4Runner','Camry','Corolla','Highlander','Prius','RAV4','Sequoia','Sienna','Tacoma','Tundra'],
  Volkswagen: ['Arteon','Atlas','Golf','ID.4','Jetta','Passat','Tiguan'],
};

const tankSizes = {
  'Acura ILX': 13.2, 'Acura TLX': 17.1, 'Acura RLX': 17.2,
  'Acura MDX': 19.5, 'Acura RDX': 17.1, 'Acura ZDX': null,
  'Acura NSX': 15.9, 'Acura Integra': 12.4,
  'Toyota Camry': 15.9, 'Toyota Corolla': 13.2, 'Toyota RAV4': 14.5,
  'Toyota Highlander': 17.9, 'Toyota Tacoma': 21.1, 'Toyota Tundra': 22.5,
  'Toyota Sienna': 18.0, 'Toyota Prius': 11.3, 'Toyota 4Runner': 23.0,
  'Toyota Sequoia': 22.5,
  'Honda Civic': 12.4, 'Honda Accord': 14.8, 'Honda CR-V': 14.0,
  'Honda Pilot': 19.5, 'Honda Odyssey': 19.5, 'Honda Ridgeline': 19.5,
  'Honda Passport': 19.5, 'Honda HR-V': 13.2, 'Honda Fit': 10.6,
  'Ford F-150': 23.0, 'Ford Escape': 14.8, 'Ford Explorer': 18.0,
  'Ford Mustang': 16.0, 'Ford Edge': 18.0, 'Ford Bronco': 16.9,
  'Ford Maverick': 15.5, 'Ford Expedition': 28.0, 'Ford Ranger': 18.0,
  'Chevrolet Silverado': 24.0, 'Chevrolet Equinox': 14.9, 'Chevrolet Traverse': 21.7,
  'Chevrolet Malibu': 15.8, 'Chevrolet Blazer': 18.3, 'Chevrolet Tahoe': 25.1,
  'Chevrolet Suburban': 28.0, 'Chevrolet Colorado': 21.0, 'Chevrolet Trax': 11.9,
  'BMW 3 Series': 15.6, 'BMW 5 Series': 15.6, 'BMW 7 Series': 21.9,
  'BMW X3': 16.6, 'BMW X5': 21.9, 'BMW X7': 21.9,
  'BMW M3': 15.6, 'BMW M5': 15.6, 'BMW i4': null, 'BMW iX': null,
  'Mercedes-Benz C-Class': 16.1, 'Mercedes-Benz E-Class': 17.4, 'Mercedes-Benz S-Class': 21.1,
  'Mercedes-Benz GLC': 16.1, 'Mercedes-Benz GLE': 21.1, 'Mercedes-Benz GLS': 26.4,
  'Mercedes-Benz A-Class': 12.4, 'Mercedes-Benz CLA': 13.7, 'Mercedes-Benz AMG GT': 16.4,
  'Volkswagen Jetta': 13.2, 'Volkswagen Passat': 18.5, 'Volkswagen Tiguan': 15.9,
  'Volkswagen Atlas': 18.6, 'Volkswagen Golf': 13.2, 'Volkswagen ID.4': null, 'Volkswagen Arteon': 15.9,
  'Hyundai Elantra': 12.4, 'Hyundai Sonata': 15.9, 'Hyundai Tucson': 14.3,
  'Hyundai Santa Fe': 17.7, 'Hyundai Palisade': 18.8, 'Hyundai Kona': 13.2,
  'Hyundai Ioniq 5': null, 'Hyundai Ioniq 6': null,
  'Kia Forte': 13.2, 'Kia K5': 15.9, 'Kia Sportage': 14.3,
  'Kia Sorento': 17.7, 'Kia Telluride': 18.8, 'Kia Soul': 14.3,
  'Kia EV6': null, 'Kia Carnival': 21.1,
  'Nissan Altima': 16.2, 'Nissan Maxima': 18.0, 'Nissan Sentra': 12.4,
  'Nissan Rogue': 14.5, 'Nissan Pathfinder': 19.5, 'Nissan Murano': 20.0,
  'Nissan Frontier': 21.0, 'Nissan Armada': 26.0, 'Nissan Leaf': null,
  'Subaru Impreza': 13.2, 'Subaru Legacy': 16.9, 'Subaru Outback': 18.5,
  'Subaru Forester': 16.6, 'Subaru Crosstrek': 15.9, 'Subaru Ascent': 19.3,
  'Subaru BRZ': 13.2, 'Subaru WRX': 15.9,
  'Mazda Mazda3': 13.2, 'Mazda Mazda6': 15.9, 'Mazda CX-5': 15.3,
  'Mazda CX-9': 19.5, 'Mazda CX-30': 13.2, 'Mazda CX-50': 15.3, 'Mazda MX-5 Miata': 11.9,
  'Audi A3': 13.2, 'Audi A4': 15.9, 'Audi A6': 17.7,
  'Audi A8': 21.1, 'Audi Q3': 15.3, 'Audi Q5': 19.8,
  'Audi Q7': 22.5, 'Audi e-tron': null, 'Audi RS6': 17.7,
  'Lexus IS': 17.4, 'Lexus ES': 17.4, 'Lexus LS': 22.4,
  'Lexus GX': 23.3, 'Lexus RX': 17.4, 'Lexus NX': 14.8,
  'Lexus UX': 13.2, 'Lexus LX': 24.6,
  'Ram 1500': 26.0, 'Ram 2500': 26.0, 'Ram 3500': 26.0, 'Ram ProMaster': 24.6,
  'GMC Sierra 1500': 24.0, 'GMC Acadia': 21.7, 'GMC Terrain': 14.9,
  'GMC Yukon': 28.0, 'GMC Canyon': 21.0,
  'Jeep Wrangler': 21.5, 'Jeep Grand Cherokee': 24.6, 'Jeep Cherokee': 15.8,
  'Jeep Compass': 13.5, 'Jeep Gladiator': 21.5, 'Jeep Renegade': 12.9,
  'Tesla Model 3': null, 'Tesla Model Y': null, 'Tesla Model S': null,
  'Tesla Model X': null, 'Tesla Cybertruck': null,
  'Dodge Charger': 18.5, 'Dodge Challenger': 18.5, 'Dodge Durango': 24.6, 'Dodge Hornet': 13.2,
  'Chrysler 300': 18.5, 'Chrysler Pacifica': 19.5, 'Chrysler Voyager': 19.5,
};

let currentTankSize = 0;

function populateModels() {
  const make = document.getElementById('car-make')?.value;
  const modelSel = document.getElementById('car-model');
  if (!modelSel) return;
  
  modelSel.innerHTML = '';
  if (!make) {
    modelSel.innerHTML = '<option>Select Make First</option>';
    return;
  }
  (carModels[make] || []).forEach(m => {
    const o = document.createElement('option');
    o.value = m;
    o.textContent = m;
    modelSel.appendChild(o);
  });
  autoFillTank();
}

function autoFillTank() {
  const make = document.getElementById('car-make')?.value;
  const model = document.getElementById('car-model')?.value;
  const key = make + ' ' + model;
  const tank = tankSizes[key];
  currentTankSize = (tank !== undefined && tank !== null) ? tank : 0;
  calcGas();
}

// Auto-decimal: insert decimal 2 places from right once 3+ digits are typed
function handleGasPriceInput(el) {
  let raw = el.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
  if (raw === '') {
    el.value = '';
    calcGas();
    return;
  }
  if (raw.length <= 2) {
    el.value = raw;
  } else {
    el.value = raw.slice(0, raw.length - 2) + '.' + raw.slice(-2);
  }
  setTimeout(() => { el.selectionStart = el.selectionEnd = el.value.length; }, 0);
  calcGas();
}

function handleLevelInput(el) {
  let raw = el.value.replace(/[^0-9.]/g, '');
  if (raw !== '' && parseFloat(raw) > 100) raw = '100';
  el.value = raw;
  calcGas();
}

function calcGas() {
  const tank = currentTankSize;
  const levelInput = document.getElementById('tank-level');
  const priceInput = document.getElementById('gas-price');
  const level = levelInput ? parseFloat(levelInput.value) || 0 : 0;
  const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;
  
  const gasResult = document.getElementById('gas-result');
  if (!tank || tank <= 0 || price <= 0) {
    if (gasResult) gasResult.classList.remove('visible');
    return;
  }
  
  const gallonsNeeded = tank * (1 - level / 100);
  const fillCost = gallonsNeeded * price;
  
  const tankSize = document.getElementById('res-tank-size');
  const gallons = document.getElementById('res-gallons');
  const cost = document.getElementById('res-fill-cost');
  const rounded = document.getElementById('res-rounded-cost');
  
  if (tankSize) tankSize.textContent = tank + ' gal';
  if (gallons) gallons.textContent = gallonsNeeded.toFixed(2) + ' gal';
  if (cost) cost.textContent = '$' + fillCost.toFixed(2);
  if (rounded) rounded.textContent = '$' + Math.round(fillCost).toFixed(2);
  
  if (gasResult) gasResult.classList.add('visible');
}

function saveCar() {
  const make = document.getElementById('car-make')?.value;
  const model = document.getElementById('car-model')?.value;
  
  if (!make || !model) {
    showToast('Select a make and model first');
    return;
  }
  
  const cars = JSON.parse(localStorage.getItem('savedCars') || '[]');
  const already = cars.find(c => c.make === make && c.model === model);
  if (already) {
    showToast('Already saved!');
    return;
  }
  
  const id = Date.now().toString();
  cars.push({ id, make, model, tank: currentTankSize });
  localStorage.setItem('savedCars', JSON.stringify(cars));
  renderSavedCar();
  showToast('🚗 Vehicle saved!');
}

function renderSavedCar() {
  const cars = JSON.parse(localStorage.getItem('savedCars') || '[]');
  const defaultId = localStorage.getItem('defaultCar');
  const card = document.getElementById('saved-car-card');
  const list = document.getElementById('saved-car-list');
  
  if (!list) return;
  
  if (cars.length === 0) {
    if (card) card.style.display = 'none';
    return;
  }
  
  if (card) card.style.display = 'block';
  list.innerHTML = '';
  
  cars.forEach(car => {
    const isDefault = car.id === defaultId;
    const row = document.createElement('div');
    row.className = 'saved-car' + (isDefault ? ' is-default' : '');
    row.innerHTML = `
      <div class="saved-car-icon">🚗</div>
      <div class="saved-car-info">
        <div class="saved-car-name">${car.make} ${car.model}</div>
        <div class="saved-car-sub">${car.tank ? car.tank + ' gal tank' : 'Tank unknown'}${isDefault ? ' · <span style="color:var(--accent2)">Default</span>' : ''}</div>
      </div>
      <div class="saved-car-actions">
        <button class="star-btn ${isDefault ? 'starred' : ''}" title="Set as default" onclick="setDefaultCar('${car.id}')">★</button>
        <button class="btn btn-sm btn-ghost" onclick="loadCarById('${car.id}')">Load</button>
        <button class="btn btn-sm btn-danger" onclick="removeCarById('${car.id}')">✕</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function setDefaultCar(id) {
  localStorage.setItem('defaultCar', id);
  renderSavedCar();
  showToast('⭐ Set as default vehicle');
}

function loadCarById(id) {
  const cars = JSON.parse(localStorage.getItem('savedCars') || '[]');
  const car = cars.find(c => c.id === id);
  if (!car) return;
  
  const makeSelect = document.getElementById('car-make');
  const modelSelect = document.getElementById('car-model');
  
  if (makeSelect) makeSelect.value = car.make;
  populateModels();
  if (modelSelect) modelSelect.value = car.model;
  
  currentTankSize = car.tank || 0;
  calcGas();
  showToast('Vehicle loaded!');
}

function removeCarById(id) {
  let cars = JSON.parse(localStorage.getItem('savedCars') || '[]');
  cars = cars.filter(c => c.id !== id);
  localStorage.setItem('savedCars', JSON.stringify(cars));
  
  const defaultId = localStorage.getItem('defaultCar');
  if (defaultId === id) localStorage.removeItem('defaultCar');
  
  renderSavedCar();
  showToast('Vehicle removed');
}

function clearSavedCar() {
  localStorage.removeItem('savedCars');
  localStorage.removeItem('defaultCar');
  renderSavedCar();
  showToast('All vehicles removed');
}

function loadSavedCar() {
  const cars = JSON.parse(localStorage.getItem('savedCars') || '[]');
  if (cars.length === 0) return;
  
  const defaultId = localStorage.getItem('defaultCar');
  const car = cars.find(c => c.id === defaultId) || cars[0];
  
  const makeSelect = document.getElementById('car-make');
  if (makeSelect) makeSelect.value = car.make;
  populateModels();
  
  const modelSelect = document.getElementById('car-model');
  if (modelSelect) modelSelect.value = car.model;
  
  currentTankSize = car.tank || 0;
  calcGas();
}

document.addEventListener('DOMContentLoaded', () => {
  renderSavedCar();
  loadSavedCar();
});
