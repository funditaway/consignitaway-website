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

      // === NEW: MULTI-PLATFORM MARKETPLACE APIs ===

      // Publish a listing to one or more platforms
      if (path.startsWith('/api/publish/')) {
        const platform = path.split('/').pop(); // ebay, amazon, facebook, whatnot, internal
        const connector = MarketplaceConnectors[platform];
        if (!connector) return new Response(JSON.stringify({ error: 'Unknown platform' }), { status: 400, headers });

        const body = await request.json(); // { listingId, credentials? }
        const listings = JSON.parse((await env.CONSIGNED_DATA.get(getKvKey('listings', sellerId))) || '[]');
        const listing = listings.find(l => l.id === body.listingId);
        if (!listing) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404, headers });

        // In production, load platform credentials from KV: env.CONSIGNED_DATA.get(`creds-${sellerId}-${platform}`)
        const creds = body.credentials || {}; 

        const result = await connector.publishListing(listing, creds);

        // Record where this listing was published
        listing.publishedTo = listing.publishedTo || {};
        listing.publishedTo[platform] = { ...result, publishedAt: new Date().toISOString() };
        await env.CONSIGNED_DATA.put(getKvKey('listings', sellerId), JSON.stringify(listings));

        return new Response(JSON.stringify({ ok: true, platform, result }), { headers });
      }

      // Bulk publish to multiple platforms
      if (path === '/api/publish-all' && method === 'POST') {
        const { listingId, platforms = ['ebay', 'internal'] } = await request.json();
        const results = {};
        const listings = JSON.parse((await env.CONSIGNED_DATA.get(getKvKey('listings', sellerId))) || '[]');
        const listing = listings.find(l => l.id === listingId);
        if (!listing) return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404, headers });

        for (const p of platforms) {
          const connector = MarketplaceConnectors[p];
          if (connector) {
            try {
              results[p] = await connector.publishListing(listing, {});
              listing.publishedTo = listing.publishedTo || {};
              listing.publishedTo[p] = results[p];
            } catch (e) {
              results[p] = { error: e.message };
            }
          }
        }
        await env.CONSIGNED_DATA.put(getKvKey('listings', sellerId), JSON.stringify(listings));
        return new Response(JSON.stringify({ ok: true, results }), { headers });
      }

      // Sync orders from all connected platforms
      if (path === '/api/sync-orders' && method === 'POST') {
        const { platforms = ['ebay'] } = await request.json();
        const allNewOrders = [];

        for (const p of platforms) {
          const connector = MarketplaceConnectors[p];
          if (connector && connector.syncOrders) {
            try {
              const platformOrders = await connector.syncOrders({});
              allNewOrders.push(...platformOrders.map(o => ({ ...o, platform: p })));
            } catch (e) {
              console.error('Sync failed for', p, e);
            }
          }
        }

        // Merge into our orders KV
        const key = getKvKey('orders', sellerId);
        let existing = JSON.parse((await env.CONSIGNED_DATA.get(key)) || '[]');
        const existingIds = new Set(existing.map(o => o.id));
        const newOnes = allNewOrders.filter(o => !existingIds.has(o.id));
        existing.unshift(...newOnes);
        await env.CONSIGNED_DATA.put(key, JSON.stringify(existing.slice(0, 200)));

        return new Response(JSON.stringify({ ok: true, imported: newOnes.length, orders: newOnes }), { headers });
      }

      // Get publishing status for a listing
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
