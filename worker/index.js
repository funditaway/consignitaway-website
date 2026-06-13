/**
 * Main Cloudflare Worker for Consign It Away
 * Includes: per-seller listings/orders, image upload, real Square payments,
 * and now multi-platform marketplace connectors.
 */

import { MarketplaceConnectors } from './connectors.js';

const SQUARE_API_BASE = 'https://connect.squareupsandbox.com';
const SQUARE_VERSION = '2024-10-01';

function getSellerId(url, request) {
  const fromQuery = url.searchParams.get('sellerId');
  const fromHeader = request.headers.get('X-Seller-Id');
  return (fromQuery || fromHeader || 'demo-seller').replace(/[^a-zA-Z0-9_-]/g, '');
}

function getKvKey(type, sellerId) {
  return `${type}-${sellerId}`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const method = request.method;
    const sellerId = getSellerId(url, request);

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Seller-Id',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const headers = { 'Content-Type': 'application/json', ...cors };

    try {
      // === EXISTING ENDPOINTS (listings, orders, upload, payments, health) ===
      // (keeping previous logic for listings/orders/upload/payments/health ...)

      if (path === '/api/listings') {
        const key = getKvKey('listings', sellerId);
        if (method === 'GET') {
          const data = (await env.CONSIGNED_DATA.get(key)) || '[]';
          return new Response(data, { headers });
        }
        if (method === 'POST') {
          const body = await request.json();
          let listings = JSON.parse((await env.CONSIGNED_DATA.get(key)) || '[]');
          const newItem = { ...body, id: body.id || 'L-' + Date.now().toString(36).toUpperCase(), createdAt: body.createdAt || new Date().toISOString(), sellerId };
          listings.unshift(newItem);
          await env.CONSIGNED_DATA.put(key, JSON.stringify(listings.slice(0, 500)));
          return new Response(JSON.stringify({ ok: true, item: newItem }), { status: 201, headers });
        }
      }

      if (path === '/api/orders') {
        const key = getKvKey('orders', sellerId);
        if (method === 'GET') {
          const data = (await env.CONSIGNED_DATA.get(key)) || '[]';
          return new Response(data, { headers });
        }
        if (method === 'POST') {
          const body = await request.json();
          let orders = JSON.parse((await env.CONSIGNED_DATA.get(key)) || '[]');
          const newOrder = { ...body, id: body.id || 'ORD-' + Date.now().toString(36).toUpperCase(), date: body.date || new Date().toISOString(), status: body.status || 'Paid - Awaiting shipment', sellerId };
          orders.unshift(newOrder);
          await env.CONSIGNED_DATA.put(key, JSON.stringify(orders.slice(0, 200)));
          return new Response(JSON.stringify({ ok: true, order: newOrder }), { status: 201, headers });
        }
      }

      if (path === '/api/upload' && method === 'POST') {
        const body = await request.json();
        if (!body.base64 || !body.base64.startsWith('data:image')) {
          return new Response(JSON.stringify({ error: 'Invalid image' }), { status: 400, headers });
        }
        const imgId = 'img-' + Date.now().toString(36);
        const imgKey = `image-${sellerId}-${imgId}`;
        await env.CONSIGNED_DATA.put(imgKey, body.base64, { expirationTtl: 60*60*24*30 });
        return new Response(JSON.stringify({ ok: true, id: imgId, dataUrl: body.base64, sellerId }), { status: 201, headers });
      }

      if (path === '/api/payments' && method === 'POST') {
        const body = await request.json();
        const { sourceId, amount, currency = 'USD', orderId } = body;
        const squareToken = env.SQUARE_ACCESS_TOKEN;
        if (!squareToken) return new Response(JSON.stringify({ error: 'Square not configured' }), { status: 500, headers });

        const payRes = await fetch(`${SQUARE_API_BASE}/v2/payments`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${squareToken}`, 'Content-Type': 'application/json', 'Square-Version': SQUARE_VERSION },
          body: JSON.stringify({
            source_id: sourceId,
            amount_money: { amount: Math.round(amount * 100), currency: currency.toUpperCase() },
            idempotency_key: `cia-${orderId || Date.now()}`,
          }),
        });
        const payData = await payRes.json();
        return new Response(JSON.stringify(payData), { status: payRes.ok ? 200 : 402, headers });
      }

      if (path === '/api/health') {
        return new Response(JSON.stringify({ ok: true, sellerId, squareConfigured: !!env.SQUARE_ACCESS_TOKEN }), { headers });
      }

      // === eBay OAuth + Credential Storage ===
      if (path === '/api/ebay/auth-url') {
        const clientId = env.EBAY_CLIENT_ID || 'YOUR_EBAY_CLIENT_ID';
        const redirectUri = env.EBAY_REDIRECT_URI || 'https://your-worker.workers.dev/api/ebay/callback';
        const scope = 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment';
        const state = JSON.stringify({ sellerId, ts: Date.now() });

        const authUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
        return new Response(JSON.stringify({ authUrl }), { headers });
      }

      if (path === '/api/ebay/callback') {
        const code = url.searchParams.get('code');
        const stateStr = url.searchParams.get('state');
        let state = {};
        try { state = JSON.parse(stateStr); } catch(e){}
        const cbSellerId = state.sellerId || sellerId;

        if (!code) return new Response('Missing code', { status: 400 });

        const clientId = env.EBAY_CLIENT_ID;
        const clientSecret = env.EBAY_CLIENT_SECRET;
        const redirectUri = env.EBAY_REDIRECT_URI;

        // Exchange code for tokens
        const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri
          })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
          return new Response(JSON.stringify({ error: 'Token exchange failed', details: tokenData }), { status: 400, headers });
        }

        // Store credentials per seller
        const credsKey = getKvKey('creds-ebay', cbSellerId);
        const creds = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: Date.now() + (tokenData.expires_in * 1000) - 60000,
          scope: tokenData.scope
        };
        await env.CONSIGNED_DATA.put(credsKey, JSON.stringify(creds));

        // Redirect back to dashboard (frontend can read query param if needed)
        return Response.redirect('https://consignitaway.com/dashboard.html?ebay_connected=true', 302);
      }

      // === MULTI-PLATFORM APIs (using connectors + stored creds) ===

      async function getFreshEbayToken(cbSellerId) {
        const credsKey = getKvKey('creds-ebay', cbSellerId);
        let creds = JSON.parse((await env.CONSIGNED_DATA.get(credsKey)) || '{}');
        if (!creds.access_token) throw new Error('eBay not connected for this seller');

        if (Date.now() > creds.expires_at) {
          // Refresh
          const clientId = env.EBAY_CLIENT_ID;
          const clientSecret = env.EBAY_CLIENT_SECRET;
          const refreshRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`) },
            body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: creds.refresh_token })
          });
          const refreshed = await refreshRes.json();
          if (refreshed.access_token) {
            creds.access_token = refreshed.access_token;
            creds.expires_at = Date.now() + (refreshed.expires_in * 1000) - 60000;
            await env.CONSIGNED_DATA.put(credsKey, JSON.stringify(creds));
          }
        }
        return creds.access_token;
      }

      // Publish to specific platform (uses stored creds)
      if (path.startsWith('/api/publish/')) {
        const platform = path.split('/').pop();
        const connector = MarketplaceConnectors[platform];
        if (!connector) return new Response(JSON.stringify({ error: 'Unknown platform' }), { status: 400, headers });

        const body = await request.json();
        const listings = JSON.parse((await env.CONSIGNED_DATA.get(getKvKey('listings', sellerId))) || '[]');
        const listing = listings.find(l => l.id === body.listingId);
        if (!listing) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404, headers });

        let token = null;
        if (platform === 'ebay') {
          token = await getFreshEbayToken(sellerId);
        }

        const result = await connector.publishListing(listing, token, env);

        listing.publishedTo = listing.publishedTo || {};
        listing.publishedTo[platform] = { ...result, publishedAt: new Date().toISOString() };
        await env.CONSIGNED_DATA.put(getKvKey('listings', sellerId), JSON.stringify(listings));

        return new Response(JSON.stringify({ ok: true, platform, result }), { headers });
      }

      // Bulk publish + AI suggestion support
      if (path === '/api/publish-all' && method === 'POST') {
        const { listingId, platforms } = await request.json();
        const listings = JSON.parse((await env.CONSIGNED_DATA.get(getKvKey('listings', sellerId))) || '[]');
        const listing = listings.find(l => l.id === listingId);
        if (!listing) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404, headers });

        const toPublish = platforms || MarketplaceConnectors.suggestPlatforms ? MarketplaceConnectors.suggestPlatforms(listing) : ['internal', 'ebay'];
        const results = {};

        for (const p of toPublish) {
          const connector = MarketplaceConnectors[p];
          if (!connector) continue;
          try {
            let token = null;
            if (p === 'ebay') token = await getFreshEbayToken(sellerId);
            results[p] = await connector.publishListing(listing, token, env);
            listing.publishedTo = listing.publishedTo || {};
            listing.publishedTo[p] = results[p];
          } catch (e) {
            results[p] = { error: e.message };
          }
        }

        await env.CONSIGNED_DATA.put(getKvKey('listings', sellerId), JSON.stringify(listings));
        return new Response(JSON.stringify({ ok: true, results, suggested: toPublish }), { headers });
      }

      // Sync orders + automatic sold updates across platforms
      if (path === '/api/sync-orders' && method === 'POST') {
        const { platforms } = await request.json();
        const allNewOrders = [];
        const toSync = platforms || ['ebay'];

        for (const p of toSync) {
          const connector = MarketplaceConnectors[p];
          if (connector?.syncOrders) {
            try {
              let token = null;
              if (p === 'ebay') token = await getFreshEbayToken(sellerId);
              const platformOrders = await connector.syncOrders(token, env);
              allNewOrders.push(...platformOrders.map(o => ({ ...o, platform: p })));
            } catch (e) { console.error('Sync error', p, e); }
          }
        }

        const ordersKey = getKvKey('orders', sellerId);
        let existingOrders = JSON.parse((await env.CONSIGNED_DATA.get(ordersKey)) || '[]');
        const existingIds = new Set(existingOrders.map(o => o.id));
        const newOnes = allNewOrders.filter(o => !existingIds.has(o.id));

        // Automatic cross-platform sold updates
        const listingsKey = getKvKey('listings', sellerId);
        let listings = JSON.parse((await env.CONSIGNED_DATA.get(listingsKey)) || '[]');
        let listingsChanged = false;

        for (const newOrder of newOnes) {
          // Mark matching listings as sold
          for (const item of (newOrder.items || [])) {
            const match = listings.find(l => l.sku === item.sku || l.name === item.name);
            if (match && match.available !== false) {
              match.available = false;
              match.soldOn = newOrder.platform;
              match.soldOrderId = newOrder.id;
              listingsChanged = true;

              // Try to update inventory / end on other platforms
              for (const [plat, info] of Object.entries(match.publishedTo || {})) {
                const conn = MarketplaceConnectors[plat];
                if (conn?.updateInventory && info.platformId) {
                  try {
                    let token = null;
                    if (plat === 'ebay') token = await getFreshEbayToken(sellerId);
                    await conn.updateInventory(match.sku, 0, token);
                  } catch(e){}
                }
              }
            }
          }
        }

        if (listingsChanged) await env.CONSIGNED_DATA.put(listingsKey, JSON.stringify(listings));

        existingOrders.unshift(...newOnes);
        await env.CONSIGNED_DATA.put(ordersKey, JSON.stringify(existingOrders.slice(0, 200)));

        return new Response(JSON.stringify({ ok: true, imported: newOnes.length, orders: newOnes }), { headers });
      }

      // Google Merchant Center feed (easy for many platforms)
      if (path === '/api/google-feed') {
        const listings = JSON.parse((await env.CONSIGNED_DATA.get(getKvKey('listings', sellerId))) || '[]');
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n<title>Consign It Away - ${sellerId}</title>\n<link>https://consignitaway.com</link>\n<description>Quality consigned items</description>\n`;

        listings.forEach(l => {
          if (l.available === false) return;
          const price = parseFloat(l.price || 0).toFixed(2);
          const images = l.photos || (l.image ? [l.image] : []);
          xml += `
<item>
  <g:id>${l.sku || l.id}</g:id>
  <g:title>${l.name}</g:title>
  <g:description>${(l.description || l.fullDescription || l.name).replace(/[<>&]/g, '')}</g:description>
  <g:link>https://consignitaway.com/shop.html</g:link>
  <g:image_link>${images[0] || ''}</g:image_link>
  <g:price>${price} USD</g:price>
  <g:availability>in stock</g:availability>
  <g:condition>${(l.condition || 'used').toLowerCase()}</g:condition>
  <g:brand>Unbranded</g:brand>
  <g:google_product_category>Apparel &amp; Accessories</g:google_product_category>
</item>`;
        });

        xml += `\n</channel>\n</rss>`;
        return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
      }

      // Suggest platforms (AI picker)
      if (path === '/api/suggest-platforms' && method === 'POST') {
        const { listingId } = await request.json();
        const listings = JSON.parse((await env.CONSIGNED_DATA.get(getKvKey('listings', sellerId))) || '[]');
        const listing = listings.find(l => l.id === listingId);
        if (!listing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });

        const suggested = MarketplaceConnectors.suggestPlatforms ? MarketplaceConnectors.suggestPlatforms(listing) : ['internal', 'ebay'];
        return new Response(JSON.stringify({ suggested }), { headers });
      }

      // Get publishing status
      if (path === '/api/marketplace-status' && method === 'GET') {
        const listingId = url.searchParams.get('listingId');
        const listings = JSON.parse((await env.CONSIGNED_DATA.get(getKvKey('listings', sellerId))) || '[]');
        const listing = listings.find(l => l.id === listingId);
        return new Response(JSON.stringify({ publishedTo: listing?.publishedTo || {} }), { headers });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
    }
  },
};
