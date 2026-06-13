const CATEGORIES = [
  { id: 'appliances', name: 'Appliances', emoji: '🏠' },
  { id: 'auto', name: 'Auto Parts', emoji: '🚗' },
  { id: 'baby', name: 'Baby', emoji: '👶' },
  { id: 'books', name: 'Books', emoji: '📚' },
  { id: 'clothing', name: 'Clothing & Jewelry', emoji: '👗' },
  { id: 'crafts', name: 'Art, Crafts & Sewing', emoji: '🎨' },
  { id: 'collectibles', name: 'Collectibles', emoji: '🏆' },
  { id: 'dining', name: 'Dining', emoji: '🍽️' },
  { id: 'electronics', name: 'Electronics', emoji: '📱' },
  { id: 'office', name: 'Office Products', emoji: '📎' },
];

const CONDITIONS = ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'Collectible'];

const PRODUCTS = [
  { id: 1, name: 'Flower Stapler', category: 'office', price: 12.99, condition: 'Like New', emoji: '🌸', image: 'assets/flower-stapler.jpg', shipping: true },
  { id: 2, name: 'Boyfriend T-Shirt with Chest Logo', category: 'clothing', price: 24.00, condition: 'Very Good', emoji: '👕', image: 'assets/boyfriend-tshirt.jpg', shipping: true },
  { id: 3, name: 'Vintage Leather Blazer', category: 'clothing', price: 89.00, condition: 'Good', emoji: '🧥', image: 'assets/vintage-leather-blazer.jpg', shipping: true },
  { id: 4, name: 'Suzuki JR50 Plastic Fender', category: 'auto', price: 100.82, condition: 'New', emoji: '🏍️', image: 'assets/suzuki-fender.jpg', shipping: false },
  { id: 5, name: 'Aromatic Gladiolus Candle', category: 'crafts', price: 32.00, condition: 'Like New', emoji: '🕯️', image: 'assets/gladiolus-candle.jpg', shipping: true },
  { id: 6, name: 'BIKEMSTR Battery BB10L-B', category: 'auto', price: 35.00, condition: 'New', emoji: '🔋', image: 'assets/bikemstr-battery.jpg', shipping: false },
  { id: 7, name: 'Kids Gray Blazer', category: 'clothing', price: 45.00, condition: 'New', emoji: '👔', image: 'assets/kids-gray-blazer.jpg', shipping: true },
  { id: 8, name: 'Desktop Publishing Guide', category: 'books', price: 18.50, condition: 'Very Good', emoji: '📖', image: 'assets/desktop-publishing-guide.jpg', shipping: true },
  { id: 9, name: 'Bluetooth Speaker', category: 'electronics', price: 55.00, condition: 'Like New', emoji: '🔊', image: 'assets/bluetooth-speaker.jpg', shipping: true },
  { id: 10, name: 'Ceramic Dinner Set (12pc)', category: 'dining', price: 72.00, condition: 'Good', emoji: '🍽️', image: 'assets/ceramic-dinner-set.jpg', shipping: false },
  { id: 11, name: 'Vintage Comic Collection', category: 'collectibles', price: 150.00, condition: 'Collectible', emoji: '📚', image: 'assets/vintage-comic-collection.jpg', shipping: true },
  { id: 12, name: 'Baby Stroller - Lightweight', category: 'baby', price: 120.00, condition: 'Very Good', emoji: '🍼', image: 'assets/baby-stroller.jpg', shipping: false },
];

window.PRODUCTS = PRODUCTS; // for product detail modal etc.

function getProductsByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return PRODUCTS;
  return PRODUCTS.filter(p => p.category === categoryId);
}

function formatPrice(price) {
  return '$' + price.toFixed(2);
}

function renderProductCard(product) {
  const cat = CATEGORIES.find(c => c.id === product.category);
  const imgHtml = product.image 
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy">` 
    : `<span>${product.emoji}</span>`;
  return `
    <article class="product-card" data-id="${product.id}" onclick="showProductModal(${product.id}, event)">
      <div class="product-image">
        ${product.shipping ? '<span class="product-badge shipping">Free Shipping</span>' : ''}
        ${imgHtml}
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <div class="product-meta">
          <span class="product-price">${formatPrice(product.price)}</span>
          <span class="condition-tag">${product.condition}</span>
        </div>
        <button class="btn btn-secondary" style="width:100%;margin-top:0.75rem;font-size:0.85rem;padding:0.5rem" onclick="event.stopImmediatePropagation(); addToCart(${product.id})">Add to Cart</button>
      </div>
    </article>
  `;
}

function renderCategoryCards(container, linkPrefix = 'shop.html?cat=') {
  if (!container) return;
  container.innerHTML = CATEGORIES.map(cat => `
    <a href="${linkPrefix}${cat.id}" class="category-card">
      <div class="emoji">${cat.emoji}</div>
      <h3>${cat.name}</h3>
    </a>
  `).join('');
}