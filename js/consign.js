let selectedCondition = '';
let selectedCategories = [];
let selectedPhotos = []; // array of data: URLs for user-uploaded images

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

  // AI / rule-based platform suggestion (Consign It Away picks best platforms)
  setTimeout(async () => {
    const form = document.getElementById('consign-form');
    if (!form) return;
    const checkboxes = form.querySelectorAll('input[name="platforms"]');
    if (!window.API_BASE) {
      // Fallback client-side suggestion
      checkboxes.forEach(cb => {
        if (['ebay', 'internal'].includes(cb.value)) cb.checked = true;
      });
      return;
    }
    try {
      // Use the suggest endpoint if available, or default
      const res = await fetch(`${window.API_BASE}/api/suggest-platforms`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ listingId: 'preview' }) });
      const data = await res.json();
      const suggested = data.suggested || ['ebay', 'internal'];
      checkboxes.forEach(cb => {
        cb.checked = suggested.includes(cb.value);
      });
    } catch (e) {
      // fallback
      checkboxes.forEach(cb => {
        if (['ebay', 'internal'].includes(cb.value)) cb.checked = true;
      });
    }
  }, 300);
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

/* ========== Photo Upload Handling (real drag/drop + previews + data URLs) ========== */
function initPhotoUpload() {
  const dropzone = document.getElementById('photo-dropzone');
  const input = document.getElementById('photo-input');
  const previews = document.getElementById('photo-previews');
  if (!dropzone || !input) return;

  // Click anywhere on zone (except explicit browse link) triggers file picker
  dropzone.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN' || e.target.closest('span')) return; // let the browse span handle itself
    input.click();
  });

  input.addEventListener('change', () => {
    if (input.files && input.files.length) handlePhotoFiles(input.files);
    input.value = ''; // allow re-selecting same file
  });

  // Drag & drop
  ['dragenter', 'dragover'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length) handlePhotoFiles(files);
  });
}

function handlePhotoFiles(fileList) {
  const previewsContainer = document.getElementById('photo-previews');
  const max = 8;
  let added = 0;

  Array.from(fileList).forEach(file => {
    if (selectedPhotos.length + added >= max) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('One or more files exceed 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      selectedPhotos.push(dataUrl);
      renderPhotoPreviews();
    };
    reader.readAsDataURL(file);
    added++;
  });
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');
  if (!container) return;
  container.innerHTML = selectedPhotos.map((src, i) => `
    <div class="photo-preview" data-index="${i}">
      <img src="${src}" alt="Preview ${i+1}">
      <button type="button" class="remove" onclick="removePhoto(${i})" aria-label="Remove photo">×</button>
    </div>
  `).join('');
}

function removePhoto(index) {
  selectedPhotos.splice(index, 1);
  renderPhotoPreviews();
}

async function handleConsignSubmit(e) {
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

  // Seller plan enforcement (demo)
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const plan = (user && user.plan) || 'starter';
  const limits = { starter: 50, professional: 500, enterprise: 999999 };
  const limit = limits[plan] || 50;

  // Count current active (async but for demo use sync local or window cache)
  let currentCount = 0;
  try {
    const cached = window.__currentListings || JSON.parse(localStorage.getItem('cia-listings') || '[]');
    currentCount = cached.filter(l => l.available !== false).length;
  } catch(e) {}

  if (currentCount >= limit) {
    showToast(`Limit reached (${limit} for ${plan} plan). Upgrade in Vendor Plans.`);
    setTimeout(() => window.location.href = 'vendor-plans.html', 1200);
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
    photos: selectedPhotos.slice(0, 8),
  };

  try {
    const saved = await window.saveListing(listing);
    const actualListingId = saved?.item?.id || listing.sku;

    // Publish to selected platforms via our new multi-platform API
    const selectedPlatforms = Array.from(form.querySelectorAll('input[name="platforms"]:checked')).map(cb => cb.value);

    if (selectedPlatforms.length > 0 && window.API_BASE) {
      try {
        await fetch(`${window.API_BASE || ''}/api/publish-all?sellerId=${encodeURIComponent(window.getCurrentSellerId ? window.getCurrentSellerId() : 'demo-seller')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: actualListingId, platforms: selectedPlatforms })
        });
      } catch (e) {
        console.warn('Initial publish failed (will be available in dashboard)', e);
      }
    }
  } catch (err) {
    // fallback already handled
  }

  // reset photos for next time
  selectedPhotos = [];
  const pv = document.getElementById('photo-previews');
  if (pv) pv.innerHTML = '';

  showToast('Item submitted! We\'ll list it on marketplaces for you.');
  setTimeout(() => window.location.href = 'dashboard.html', 1500);
}

/* Expose for any future inline scripts if needed */
window.getSelectedPhotos = () => selectedPhotos;

document.addEventListener('DOMContentLoaded', () => {
  initConsignForm();
  initPhotoUpload();
});