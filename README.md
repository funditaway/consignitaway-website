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

- `index.html`, `shop.html`, `consign.html`, `how-it-works.html`, `vendor-plans.html`, `contact.html`, `dashboard.html`
- `css/styles.css` — teal/orange design system
- `js/main.js` — shared header, footer, cart, search, nav
- `js/products.js` — categories + demo PRODUCTS + render helpers
- `js/consign.js` — form logic for submitting listings (persisted in localStorage)
- `wrangler.toml` — Cloudflare Pages config (static output from root)
- `_redirects` — placeholder for hosting redirects
- `CNAME` — custom domain hint for GitHub Pages
- `deploy-dns.ps1` — PowerShell helper to point consignitaway.com DNS at GitHub Pages via Cloudflare API

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
- **Real product images**: Professional studio photos (generated) for all 12 demo items live in `assets/`. Product cards use `<img>` (contain on white).
- **Photo upload + detail modal**: Consign form has drag & drop + live previews (stored as data URLs). All product cards are now clickable → beautiful detail modal with large photo(s), full description, add-to-cart, and "Consign Similar".
- **Checkout & Orders (real backend)**: Cart icon opens modal. Regular checkout or full Square Web Payments SDK button (sandbox). Orders go to KV via Worker (or local fallback). Seller Dashboard has working Orders tab with Ship/Delivered.
- **Seller plan enforcement**: Consign form checks your plan limit (Starter=50, etc.). Upgrade link if over.
- **Dashboard**: Fully interactive panels (Products with live filters + photos, Orders, Messages). Dynamic stats + personal greeting when signed in.
- **Persistence**: See the new "tiny backend" section below for Cloudflare Workers + KV.
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
