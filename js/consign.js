let selectedCondition = '';
let selectedCategories = [];

function initConsignForm() {
  const conditionGrid = document.getElementById('condition-grid');
  if (conditionGrid) {
    conditionGrid.innerHTML = CONDITIONS.map(c => `
      <button type="button" class="condition-option" data-condition="${c}" onclick="selectCondition('${c}', this)">
        <strong>${c}</strong>
        <span>${getConditionDesc(c)}</span>
      </button>
    `).join('');
  }

  const categorySelect = document.getElementById('category-select');
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Select a category</option>' +
      CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  const urlCat = getQueryParam('cat');
  if (urlCat) {
    const select = document.getElementById('category-select');
    if (select) {
      select.value = urlCat;
      addCategoryTag(urlCat);
    }
  }
}

function getConditionDesc(condition) {
  const descs = {
    'New': 'Never used, sealed',
    'Like New': 'Barely used',
    'Very Good': 'Minor wear',
    'Good': 'Normal wear',
    'Acceptable': 'Visible wear',
    'Collectible': 'Rare / vintage',
  };
  return descs[condition] || '';
}

function selectCondition(condition, el) {
  selectedCondition = condition;
  document.querySelectorAll('.condition-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function addCategoryTag(catId) {
  if (!catId || selectedCategories.includes(catId)) return;
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return;
  selectedCategories.push(catId);
  renderCategoryTags();
}

function removeCategoryTag(catId) {
  selectedCategories = selectedCategories.filter(c => c !== catId);
  renderCategoryTags();
}

function renderCategoryTags() {
  const container = document.getElementById('category-tags');
  if (!container) return;
  container.innerHTML = selectedCategories.map(id => {
    const cat = CATEGORIES.find(c => c.id === id);
    return `<span class="tag">${cat.name} <button type="button" onclick="removeCategoryTag('${id}')">×</button></span>`;
  }).join('');
}

function handleCategoryChange(e) {
  addCategoryTag(e.target.value);
  e.target.value = '';
}

function handleConsignSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.productName.value.trim();
  const description = form.description.value.trim();

  if (!name) {
    showToast('Please enter a product name');
    return;
  }
  if (selectedCategories.length === 0) {
    showToast('Please select at least one category');
    return;
  }
  if (!selectedCondition) {
    showToast('Please select a CIA condition');
    return;
  }

  const listing = {
    name,
    categories: selectedCategories,
    description,
    fullDescription: form.fullDescription.value.trim(),
    condition: selectedCondition,
    sku: 'CIA-' + Date.now().toString(36).toUpperCase(),
    available: form.available.checked,
    createdAt: new Date().toISOString(),
  };

  const listings = JSON.parse(localStorage.getItem('cia-listings') || '[]');
  listings.push(listing);
  localStorage.setItem('cia-listings', JSON.stringify(listings));

  showToast('Item submitted! We\'ll list it on marketplaces for you.');
  setTimeout(() => window.location.href = 'dashboard.html', 1500);
}

document.addEventListener('DOMContentLoaded', initConsignForm);