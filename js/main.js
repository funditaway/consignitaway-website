let cart = JSON.parse(localStorage.getItem('cia-cart') || '[]');

function saveCart() {
  localStorage.setItem('cia-cart', JSON.stringify(cart));
  updateCartBadge();
}

/* ========== Tiny Backend API Layer (Cloudflare Worker + KV) ==========
   Set API_BASE to your deployed Worker URL after you run the Worker.
   Example: 'https://consignitaway-api.yourname.workers.dev'
   Falls back to localStorage for local dev / before deploy.
*/
let API_BASE = ''; // <-- CHANGE THIS after deploying the Worker (see README)
window.API_BASE = API_BASE;

async function loadListings() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/listings`, { method: 'GET' });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[api] listings fetch failed, using localStorage fallback', e);
    }
  }
  return JSON.parse(localStorage.getItem('cia-listings') || '[]');
}

async function saveListing(listing) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listing),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[api] saveListing failed, using local fallback', e);
    }
  }
  const listings = JSON.parse(localStorage.getItem('cia-listings') || '[]');
  listings.unshift(listing);
  localStorage.setItem('cia-listings', JSON.stringify(listings));
  return { ok: true, item: listing };
}

async function loadOrders() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[api] orders fetch failed, local fallback', e);
    }
  }
  return JSON.parse(localStorage.getItem('cia-orders') || '[]');
}

async function saveOrder(order) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[api] saveOrder failed, local fallback', e);
    }
  }
  const orders = JSON.parse(localStorage.getItem('cia-orders') || '[]');
  orders.unshift(order);
  localStorage.setItem('cia-orders', JSON.stringify(orders));
  return { ok: true, order };
}

// Make available to other scripts (no modules)
window.loadListings = loadListings;
window.saveListing = saveListing;
window.loadOrders = loadOrders;
window.saveOrder = saveOrder;
window.getApiBase = () => API_BASE;

function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (badge) badge.textContent = cart.length;
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  cart.push(product);
  saveCart();
  showToast(`Added "${product.name}" to cart`);
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const path = window.location.pathname.split('/').pop() || 'index.html';

  header.innerHTML = `
    <div class="top-bar">
      <div class="container">
        <span>📞 <a href="tel:4177201199">(417) 720-1199</a></span>
        <span>📍 1522-1526 S Glenstone Ave, Springfield, MO 65804</span>
        <span><a href="mailto:info@consignitaway.com">info@consignitaway.com</a></span>
      </div>
    </div>
    <div class="container header-inner">
      <a href="index.html" class="logo">
        <div class="logo-icon">↑</div>
        consign <span>it</span> away
      </a>
      <form class="search-bar" onsubmit="handleSearch(event)">
        <select aria-label="Search category">
          <option>All Categories</option>
          ${CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <input type="search" placeholder="Search items..." aria-label="Search items">
        <button type="submit" aria-label="Search">🔍</button>
      </form>
      <div class="header-actions">
        ${getCurrentUser() ? `<a href="account.html" class="icon-btn" title="My Account" style="text-decoration:none;font-size:0.8rem;width:auto;padding:0 0.65rem;border-radius:20px">${getCurrentUser().name.split(' ')[0]}</a>` : `<a href="login.html" class="icon-btn" title="Log In" style="text-decoration:none;font-size:0.75rem;width:auto;padding:0 0.6rem;border-radius:20px">Login</a>`}
        <button onclick="showUserModal()" class="icon-btn" title="Quick account (demo)" style="border:none">👤</button>
        <button class="icon-btn" title="Wishlist" onclick="showToast('Wishlist demo')">♡</button>
        <button onclick="showCartModal(event)" class="icon-btn" title="Cart" style="border:none">
          🛒
          <span class="badge cart-badge">${cart.length}</span>
        </button>
        <button class="nav-toggle" onclick="toggleNav()" aria-label="Menu">☰</button>
      </div>
    </div>
    <nav class="main-nav" id="main-nav">
      <div class="container">
        <ul class="nav-links">
          <li><a href="index.html" ${path === 'index.html' ? 'class="active"' : ''}>Home</a></li>
          <li><a href="shop.html" ${path === 'shop.html' ? 'class="active"' : ''}>Shop Online</a></li>
          <li><a href="deals.html" ${path === 'deals.html' ? 'class="active"' : ''}>Daily Deals</a></li>
          <li><a href="brands.html" ${path === 'brands.html' ? 'class="active"' : ''}>Brands</a></li>
          <li><a href="consign.html" ${path === 'consign.html' ? 'class="active"' : ''}>Consign an Item</a></li>
          <li><a href="shipping.html" ${path === 'shipping.html' ? 'class="active"' : ''}>Shipping</a></li>
          <li><a href="how-it-works.html" ${path === 'how-it-works.html' ? 'class="active"' : ''}>How Selling Works</a></li>
          <li><a href="vendor-plans.html" ${path === 'vendor-plans.html' ? 'class="active"' : ''}>Vendor Plans</a></li>
          <li><a href="contact.html" ${path === 'contact.html' ? 'class="active"' : ''}>Contact Us</a></li>
          <li class="nav-cta"><a href="consign.html" class="btn btn-primary" style="padding:0.5rem 1.25rem">Sell Online</a></li>
        </ul>
      </div>
    </nav>
  `;
}

function initFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="logo" style="margin-bottom:1rem">
            <div class="logo-icon">↑</div>
            consign <span>it</span> away
          </div>
          <p style="font-size:0.9rem;line-height:1.7;max-width:320px">
            Springfield's trusted consignment marketplace. We list your items across multiple online marketplaces and handle shipping so you don't have to.
          </p>
          <div class="marketplace-badges" style="margin-top:1.25rem">
            <span class="marketplace-badge">eBay</span>
            <span class="marketplace-badge">Amazon</span>
            <span class="marketplace-badge">Whatnot</span>
            <span class="marketplace-badge">Facebook</span>
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><a href="shop.html">Browse All</a></li>
            <li><a href="shop.html?cat=clothing">Clothing</a></li>
            <li><a href="shop.html?cat=electronics">Electronics</a></li>
            <li><a href="shop.html?cat=collectibles">Collectibles</a></li>
          </ul>
        </div>
        <div>
          <h4>Sell</h4>
          <ul>
            <li><a href="consign.html">Consign an Item</a></li>
            <li><a href="how-it-works.html">How It Works</a></li>
            <li><a href="vendor-plans.html">Vendor Plans</a></li>
            <li><a href="dashboard.html">Seller Dashboard</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="tel:4177201199">(417) 720-1199</a></li>
            <li><a href="mailto:info@consignitaway.com">info@consignitaway.com</a></li>
            <li>1522-1526 S Glenstone Ave</li>
            <li>Springfield, MO 65804</li>
            <li>87 Buena Vista Pkwy</li>
            <li>Strafford, MO 65757</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Consign It Away. All rights reserved.</span>
        <span>
          <a href="https://www.facebook.com/consignitaway/" target="_blank" rel="noopener">Facebook</a> ·
          <a href="https://www.instagram.com/consignitaway/" target="_blank" rel="noopener">Instagram</a> ·
          <a href="https://www.whatnot.com/user/consignitaway" target="_blank" rel="noopener">Whatnot</a>
        </span>
      </div>
    </div>
  `;
}

function handleSearch(e) {
  e.preventDefault();
  const form = e.target;
  const query = form.querySelector('input[type="search"]').value;
  const cat = form.querySelector('select').value;
  let url = 'shop.html?';
  if (cat && cat !== 'All Categories') url += `cat=${cat}&`;
  if (query) url += `q=${encodeURIComponent(query)}`;
  window.location.href = url;
}

function toggleNav() {
  document.getElementById('main-nav')?.classList.toggle('open');
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'assets/favicon.svg';
    document.head.appendChild(link);
  }
  initHeader();
  initFooter();
  updateCartBadge();
});

/* ========== Simple Cart + Checkout (demo) ========== */
function getCartTotal() {
  return cart.reduce((sum, p) => sum + (p.price || 0), 0);
}

function showCartModal(e) {
  if (e) e.preventDefault();
  const existing = document.getElementById('cart-modal');
  if (existing) existing.remove();

  const total = getCartTotal();
  const itemsHtml = cart.length ? cart.map((p, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--gray-200)">
      <div>${p.emoji || '📦'} <strong>${p.name}</strong></div>
      <div>$${p.price.toFixed(2)} <button onclick="removeFromCart(${i});showCartModal()" style="margin-left:8px;background:none;border:none;color:#c00;cursor:pointer">×</button></div>
    </div>
  `).join('') : '<p style="color:var(--gray-500)">Your cart is empty. Add items from the Shop.</p>';

  const modal = document.createElement('div');
  modal.id = 'cart-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:#fff;max-width:460px;width:92%;border-radius:12px;padding:1.25rem 1.5rem;box-shadow:var(--shadow-lg)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <h3 style="margin:0">Your Cart</h3>
        <button onclick="document.getElementById('cart-modal').remove()" style="background:none;border:none;font-size:1.4rem;line-height:1;cursor:pointer">×</button>
      </div>
      <div style="max-height:240px;overflow:auto;margin-bottom:1rem">${itemsHtml}</div>
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:1rem">
        <div>Total</div><div>$${total.toFixed(2)}</div>
      </div>

      ${cart.length ? `
      <div style="border-top:1px solid var(--gray-200);padding-top:1rem">
        <div style="font-size:0.85rem;color:var(--gray-500);margin-bottom:0.5rem">Quick checkout (demo)</div>
        <button onclick="doCheckout()" class="btn btn-primary" style="width:100%;margin-bottom:0.5rem">Checkout • Pay $${total.toFixed(2)}</button>

        <!-- Real Square integration (sandbox) -->
        <button onclick="initSquareCheckout(${total})" class="btn btn-outline" style="width:100%;font-size:0.9rem">Pay with Square (Sandbox)</button>
        <div id="square-card-container" style="margin-top:0.5rem"></div>
        <div style="font-size:0.65rem;text-align:center;margin-top:0.25rem;color:var(--gray-500)">Loads Square Web Payments SDK • replace appId/locationId with your sandbox credentials for real use</div>
      </div>` : ''}
      <div style="margin-top:0.75rem;text-align:right">
        <a href="shop.html" style="font-size:0.85rem">Continue shopping</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  // modal will be refreshed by caller
}

async function doCheckout() {
  if (!cart.length) return;
  const total = getCartTotal();

  // Simple demo buyer info (prompts keep it lightweight)
  const buyerName = prompt('Buyer name for this demo order?', 'Jordan Lee') || 'Demo Buyer';
  const buyerAddr = prompt('Shipping address?', '456 Oak Ave, Springfield, MO 65804') || 'Demo Address';

  const order = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase().slice(-8),
    date: new Date().toISOString(),
    items: cart.map(p => ({ id: p.id, name: p.name, price: p.price, emoji: p.emoji })),
    total,
    status: 'Paid - Awaiting shipment',
    buyer: { name: buyerName, address: buyerAddr }
  };

  if (window.saveOrder) {
    await window.saveOrder(order);
  } else {
    const orders = JSON.parse(localStorage.getItem('cia-orders') || '[]');
    orders.unshift(order);
    localStorage.setItem('cia-orders', JSON.stringify(orders));
  }

  // clear cart
  cart = [];
  saveCart();

  // close modal
  const m = document.getElementById('cart-modal');
  if (m) m.remove();

  showToast(`Order ${order.id} placed! Seller dashboard updated.`);
  // helpful redirect for seller view
  setTimeout(() => {
    if (confirm('View the order in your Seller Dashboard?')) {
      window.location.href = 'dashboard.html';
    }
  }, 800);
}

/* ========== Square Web Payments (real SDK integration, sandbox demo) ========== */
async function initSquareCheckout(total) {
  const container = document.getElementById('square-card-container');
  if (!container) return;

  // Square sandbox test credentials (public examples; get your own from developer.squareup.com for production)
  const appId = 'sandbox-sq0idb-YourAppIdReplaceMe';   // <-- REPLACE with your Square sandbox Application ID
  const locationId = 'YOUR_SANDBOX_LOCATION_ID';       // <-- REPLACE with your sandbox Location ID

  if (appId.includes('ReplaceMe')) {
    showToast('Square demo: Using placeholder credentials. Replace in code for real sandbox testing.');
    // Fall back to regular checkout
    await doCheckout();
    return;
  }

  container.innerHTML = `<div style="padding:0.75rem;border:1px solid var(--gray-300);border-radius:8px">Loading Square...</div>`;

  // Load SDK if not present
  if (!window.Square) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  try {
    const payments = window.Square.payments(appId, locationId);
    const card = await payments.card();
    await card.attach('#square-card-container');

    container.innerHTML = `
      <div id="square-card-container" style="margin:0.5rem 0"></div>
      <button id="square-pay-btn" class="btn btn-primary" style="width:100%">Pay $${total.toFixed(2)} with Square</button>
      <div style="font-size:0.65rem;color:#666;margin-top:4px">Test card: 4111 1111 1111 1111 • any future date • any CVV</div>
    `;

    const payBtn = document.getElementById('square-pay-btn');
    payBtn.onclick = async () => {
      payBtn.disabled = true;
      payBtn.textContent = 'Processing...';
      try {
        const result = await card.tokenize();
        if (result.status === 'OK') {
          // In real app you would POST the token + amount to your server / Worker to charge
          showToast('Square token created (demo). Completing order...');
          await doCheckout();  // this will create the order and clear cart
          const m = document.getElementById('cart-modal');
          if (m) m.remove();
        } else {
          showToast('Square error: ' + (result.errors ? result.errors[0].message : 'Unknown'));
          payBtn.disabled = false;
          payBtn.textContent = `Pay $${total.toFixed(2)} with Square`;
        }
      } catch (err) {
        showToast('Square tokenize failed (demo)');
        payBtn.disabled = false;
        payBtn.textContent = `Pay $${total.toFixed(2)} with Square`;
      }
    };
  } catch (err) {
    console.error(err);
    showToast('Could not initialize Square (check credentials in code). Using regular checkout.');
    await doCheckout();
  }
}

/* ========== Seller Auth Simulation (demo) ========== */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('cia-user') || 'null');
  } catch (e) { return null; }
}

function getCurrentSellerId() {
  const user = getCurrentUser();
  return (user && user.sellerId) || 'demo-seller';
}

window.getCurrentSellerId = getCurrentSellerId;
window.getCurrentUser = getCurrentUser;

function saveCurrentUser(user) {
  localStorage.setItem('cia-user', JSON.stringify(user));
  // refresh header if present
  const header = document.getElementById('site-header');
  if (header) {
    // quick re-init for name display
    initHeader();
    updateCartBadge();
  }
}

function showUserModal() {
  const existing = document.getElementById('user-modal');
  if (existing) existing.remove();

  const current = getCurrentUser() || { name: '', email: 'you@example.com' };

  const modal = document.createElement('div');
  modal.id = 'user-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:#fff;max-width:380px;width:92%;border-radius:12px;padding:1.25rem 1.5rem;box-shadow:var(--shadow-lg)">
      <h3 style="margin:0 0 0.75rem">Seller Account (demo)</h3>
      <form id="user-form">
        <div class="form-group" style="margin-bottom:0.75rem">
          <label style="font-size:0.85rem">Name</label>
          <input name="name" value="${current.name || 'Alex Consignor'}" style="width:100%;padding:0.5rem;border:1px solid var(--gray-300);border-radius:6px">
        </div>
        <div class="form-group" style="margin-bottom:0.75rem">
          <label style="font-size:0.85rem">Email</label>
          <input name="email" type="email" value="${current.email}" style="width:100%;padding:0.5rem;border:1px solid var(--gray-300);border-radius:6px">
        </div>
        <div class="form-group" style="margin-bottom:1rem">
          <label style="font-size:0.85rem">Plan</label>
          <select name="plan" style="width:100%;padding:0.5rem;border:1px solid var(--gray-300);border-radius:6px">
            <option value="starter" ${(!current.plan || current.plan==='starter') ? 'selected' : ''}>Starter (50 listings)</option>
            <option value="professional" ${current.plan==='professional' ? 'selected' : ''}>Professional (500 listings)</option>
            <option value="enterprise" ${current.plan==='enterprise' ? 'selected' : ''}>Enterprise (Unlimited)</option>
          </select>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button type="submit" class="btn btn-primary" style="flex:1">Save &amp; Sign In</button>
          <button type="button" class="btn btn-outline" onclick="signOutUser();document.getElementById('user-modal').remove()">Sign Out</button>
        </div>
      </form>
      <div style="font-size:0.7rem;color:var(--gray-500);margin-top:0.75rem;text-align:center">Demo only — data stays in your browser</div>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('#user-form');
  form.onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const user = { 
      name: fd.get('name').trim() || 'Seller', 
      email: fd.get('email'),
      plan: fd.get('plan') || 'starter'
    };
    saveCurrentUser(user);
    modal.remove();
    showToast(`Signed in as ${user.name} (${user.plan})`);
  };
}

function signOutUser() {
  localStorage.removeItem('cia-user');
  const m = document.getElementById('user-modal');
  if (m) m.remove();
  const header = document.getElementById('site-header');
  if (header) initHeader();
  showToast('Signed out (demo)');
}

// Personalize header with user name if present (called after initHeader)
function personalizeHeader() {
  const user = getCurrentUser();
  if (!user) return;
  const actions = document.querySelector('.header-actions');
  if (actions) {
    const existing = actions.querySelector('.user-name');
    if (existing) existing.remove();
    const span = document.createElement('span');
    span.className = 'user-name';
    span.style.cssText = 'font-size:0.8rem;color:rgba(255,255,255,0.85);margin-right:0.25rem;white-space:nowrap';
    span.textContent = user.name.split(' ')[0];
    actions.insertBefore(span, actions.firstChild);
  }
}

// Hook personalization after header init (call once)
setTimeout(() => {
  const origInit = window.initHeader;
  if (typeof origInit === 'function') {
    // already rendered on load; personalize now
    personalizeHeader();
  }
}, 60);

/* ========== Product Detail Modal (better images + polish) ========== */
function showProductModal(id, evt) {
  if (evt) evt.stopImmediatePropagation();
  const product = (window.PRODUCTS || PRODUCTS || []).find(p => p.id === id);
  if (!product) return showToast('Product not found');

  const existing = document.getElementById('product-modal');
  if (existing) existing.remove();

  const images = (product.photos && product.photos.length) ? product.photos : (product.image ? [product.image] : []);
  let currentImg = images[0] || '';

  const modal = document.createElement('div');
  modal.id = 'product-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  const thumbs = images.length > 1 ? images.map((src, i) => `
    <img src="${src}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:2px solid ${i===0?'var(--teal-600)':'transparent'};cursor:pointer" 
         onclick="document.getElementById('main-product-img').src='${src}'; this.parentNode.querySelectorAll('img').forEach((im,ii)=>im.style.borderColor=ii===${i}?'var(--teal-600)':'transparent')">
  `).join('') : '';

  modal.innerHTML = `
    <div onclick="event.stopImmediatePropagation()" style="background:#fff;max-width:820px;width:100%;border-radius:16px;overflow:hidden;box-shadow:var(--shadow-lg)">
      <div style="display:grid;grid-template-columns:1fr 380px;gap:0">
        <!-- Images -->
        <div style="background:#f8f9fa;padding:1.25rem;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <img id="main-product-img" src="${currentImg}" alt="${product.name}" style="max-width:100%;max-height:420px;object-fit:contain;border-radius:8px;background:white">
          ${thumbs ? `<div style="display:flex;gap:8px;margin-top:1rem;flex-wrap:wrap;justify-content:center">${thumbs}</div>` : ''}
        </div>
        <!-- Info -->
        <div style="padding:1.5rem 1.75rem;display:flex;flex-direction:column">
          <button onclick="document.getElementById('product-modal').remove()" style="align-self:flex-end;background:none;border:none;font-size:1.6rem;line-height:1;cursor:pointer;margin-bottom:0.25rem">×</button>
          
          <div style="flex:1">
            <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.25rem">
              <span class="condition-tag">${product.condition}</span>
              ${product.shipping ? '<span class="product-badge shipping" style="position:static">Free Shipping</span>' : ''}
            </div>
            <h2 style="font-size:1.35rem;margin:0 0 0.25rem;color:var(--teal-900)">${product.name}</h2>
            <div style="font-size:1.65rem;font-weight:700;color:var(--teal-700);margin-bottom:0.75rem">${formatPrice ? formatPrice(product.price) : '$' + product.price}</div>

            <p style="color:var(--gray-700);line-height:1.5;margin-bottom:1rem">${product.fullDescription || product.description || 'Quality consigned item. Our CIA condition rating helps buyers shop with confidence.'}</p>

            <div style="font-size:0.85rem;color:var(--gray-500);margin-bottom:1rem">
              Category: ${(product.categories || [product.category]).map(c => {
                const cat = (window.CATEGORIES || []).find(x => x.id === c) || {name: c};
                return cat.name;
              }).join(', ')}
            </div>
          </div>

          <div style="display:flex;gap:0.75rem;margin-top:auto">
            <button class="btn btn-secondary" style="flex:1" onclick="addToCart(${product.id}); document.getElementById('product-modal').remove();">Add to Cart</button>
            <button class="btn btn-primary" style="flex:1" onclick="document.getElementById('product-modal').remove(); window.location.href='consign.html';">Consign Similar</button>
          </div>
          <div style="font-size:0.7rem;text-align:center;margin-top:0.5rem;color:var(--gray-500)">Demo — real photos from our studio</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}