# Consign It Away

Static website for Consign It Away — Springfield, MO consignment marketplace.

**Live (when deployed):** https://consignitaway.com

## Quick Start (Local Preview)

```powershell
cd consignitaway-website
npm run dev
# or
npx --yes serve . -p 3000
```

Open http://localhost:3000 (or the port reported).

The site is fully static/client-side:
- Browse products (demo data in `js/products.js`)
- Consign form saves to localStorage and redirects to dashboard
- Cart, dashboard (products/orders/messages tabs via JS), search, filters all work in-browser
- No backend / real payments / marketplace sync (demo only)

## Project Structure

- Core pages: `index.html`, `shop.html`, `product.html`, `cart.html`, `checkout.html`, `confirmation.html`, `deals.html`, `brands.html`, `shipping.html`
- Auth & Seller: `login.html`, `dashboard.html`, `account.html`, `payouts.html`, `connections.html`, `consign.html`
- Info & Legal: `how-it-works.html`, `vendor-plans.html`, `contact.html`, `about.html`, `faq.html`, `marketplaces.html`, `ai-recommendations.html`, `terms.html`, `privacy.html`, `returns.html`, `admin.html`, `404.html`
- `css/styles.css` — teal/orange design system
- `js/main.js` — shared header (dynamic login state), footer, cart, search, nav
- `js/products.js` — categories + demo PRODUCTS + render helpers (links to product.html)
- `js/consign.js` — form logic for submitting listings (with AI platform suggestions)
- `wrangler.toml` — Cloudflare Pages config (static output from root)
- `_redirects` — placeholder for hosting redirects
- `CNAME` — custom domain hint for GitHub Pages
- `deploy-dns.ps1` — PowerShell helper to point consignitaway.com DNS at GitHub Pages via Cloudflare API
- `worker/` — Cloudflare Worker backend (listings, orders, eBay OAuth, publish, Google feed, etc.)

## Deployment Options

### Get the real domain live (consignitaway.com) + Backend

This repo's git remote is `https://github.com/funditaway/consignitaway-website.git`.

#### 1. Deploy the tiny backend (Cloudflare Workers + KV) for real persistence
Listings (from consign) and orders (from checkout) now try the Worker API first, then fall back to localStorage.

```powershell
# Create KV namespace (one time)
npx wrangler kv:namespace create "CONSIGNED_DATA"

# Paste the returned `id` into wrangler-worker.toml under [[kv_namespaces]]

# Deploy the Worker
npm run deploy:worker
# (or npx wrangler deploy --config wrangler-worker.toml)
```

You will get a URL like `https://consignitaway-api.yourname.workers.dev`.

**Then** edit `js/main.js` near the top:
```js
let API_BASE = 'https://consignitaway-api.yourname.workers.dev';
```
Rebuild/push the site.

The Worker (`worker/index.js`) exposes `/api/listings` and `/api/orders`.

#### 2. Deploy / update the static site
**GitHub Pages + Cloudflare DNS (recommended with current files):**
```powershell
git add .
git commit -m "Worker+KV backend, Square checkout, product detail modal, plan enforcement"
git push origin main
```

Then in GitHub:
- Settings → Pages → Source: GitHub Actions, Custom domain `consignitaway.com`, Enforce HTTPS.

Update DNS:
```powershell
$env:CLOUDFLARE_API_TOKEN = "your-edit-token"
npm run dns:update
```

**Cloudflare Pages:**
- Connect the repo (output dir `.`).
- Add custom domain in the project.
- `npm run deploy:cf` for manual.

#### 3. Square real checkout (sandbox)
In the cart modal there's a "Pay with Square (Sandbox)" button.
- Sign up at developer.squareup.com (free)
- Create Sandbox app → copy Application ID + Location ID
- Replace the two placeholders inside `initSquareCheckout` in `js/main.js`
- It loads the official SDK, shows a card form, tokenizes (use 4111 1111 1111 1111), then completes the order.

#### 4. Test the complete flow on the live domain
- Sign in via 👤 (choose plan)
- Consign items (photos are uploaded via the form)
- Shop, add to cart, use either regular Checkout or the Square button
- Dashboard → Orders tab to fulfill
- Click any product card for the nice detail modal with photos

All features gracefully fall back if the Worker isn't deployed yet.

## Notes / Current State
- **Full site structure**: Buyer flow (Shop → Product Detail → Cart → Checkout → Confirmation), Seller flow (Login → Consign with AI platform suggestions → Dashboard → Connections/Payouts/Account).
- **New pages**: product.html (full details with gallery), cart.html, checkout.html, confirmation.html, login.html (signup tabs), account.html, payouts.html, connections.html (eBay connect with OAuth), faq, about, marketplaces, ai-recommendations, admin demo, 404, legal pages.
- **Real product images**: Professional studio photos (generated) for all 12 demo items live in `assets/`. Product cards link to product.html.
- **Photo upload + AI**: Consign form has drag & drop + live previews (data URLs). AI suggests platforms (ebay/internal by default, backend /api/suggest-platforms for more).
- **Checkout & Orders (real backend)**: Full pages. Square or demo. Orders saved to local + Worker API. Dashboard uses them.
- **Seller plan enforcement & connections**: Consign checks plan. Connections page for platforms, with live eBay OAuth via Worker.
- **Dashboard**: Interactive panels, now with sidebar links to new pages. Dynamic from local/API.
- **Persistence & Multi-platform**: Worker for listings/orders/publish/sync (eBay full, others stub), Google feed, per-seller. See worker/ for details.
- **Header**: Add "Login" link in nav (see main.js). For dynamic user name linking to account, personalize after innerHTML using getCurrentUser.
- **Seller account (demo)**: Click the 👤 icon in header to "sign in" (name/email persisted). Shows short name in header and personal greeting in dashboard.
- Listings / cart / orders remain browser-only (localStorage) — perfect demo / prototype. Real production would add backend, auth, real marketplace APIs, and payments.
- SEO: Basic Open Graph + meta on homepage. More pages can be extended.
- Contact info, phone, addresses, and marketplace badges match the live business profiles.
- GitHub Action (`.github/workflows/deploy.yml`) + updated `deploy-dns.ps1` + package scripts make going live straightforward. See "Get the real domain live" section above.

## Business Context
Consign It Away helps people in the Springfield, MO area (Glenstone Ave + Strafford location) sell items online by listing across eBay, Amazon, Whatnot, Facebook Marketplace, and their own store. They offer pickup and handle fulfillment.

See also:
- Facebook: https://www.facebook.com/consignitaway/
- Instagram: https://www.instagram.com/consignitaway/
- Whatnot: https://www.whatnot.com/user/consignitaway

---

Built as a lightweight marketing + demo site. Ready to expand into a full seller platform.
