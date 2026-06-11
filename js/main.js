let cart = JSON.parse(localStorage.getItem('cia-cart') || '[]');

function saveCart() {
  localStorage.setItem('cia-cart', JSON.stringify(cart));
  updateCartBadge();
}

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
        <a href="dashboard.html" class="icon-btn" title="My Account">👤</a>
        <button class="icon-btn" title="Wishlist">♡</button>
        <a href="shop.html" class="icon-btn" title="Cart">
          🛒
          <span class="badge cart-badge">${cart.length}</span>
        </a>
        <button class="nav-toggle" onclick="toggleNav()" aria-label="Menu">☰</button>
      </div>
    </div>
    <nav class="main-nav" id="main-nav">
      <div class="container">
        <ul class="nav-links">
          <li><a href="index.html" ${path === 'index.html' ? 'class="active"' : ''}>Home</a></li>
          <li><a href="shop.html" ${path === 'shop.html' ? 'class="active"' : ''}>Shop Online</a></li>
          <li><a href="consign.html" ${path === 'consign.html' ? 'class="active"' : ''}>Consign an Item</a></li>
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
  initHeader();
  initFooter();
  updateCartBadge();
});