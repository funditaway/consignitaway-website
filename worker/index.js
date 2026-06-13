/**
 * Cloudflare Worker for Consign It Away
 * Tiny backend for listings and orders using KV.
 *
 * Deploy:
 *   1. wrangler login
 *   2. Create KV: wrangler kv:namespace create "CONSIGNED_DATA"
 *   3. Add the id to wrangler.toml under [[kv_namespaces]]
 *   4. wrangler deploy --config wrangler-worker.toml  (or use the one below)
 *
 * Endpoints (demo uses global "demo" key for simplicity - no auth):
 *   GET  /api/listings
 *   POST /api/listings   {name, categories, ... , photos? }
 *   GET  /api/orders
 *   POST /api/orders     {items, total, buyer, ...}
 *
 * CORS open for demo (lock down in production).
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const method = request.method;

    // CORS preflight + headers
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const headers = { 'Content-Type': 'application/json', ...cors };

    try {
      if (path === '/api/listings') {
        if (method === 'GET') {
          const data = (await env.CONSIGNED_DATA.get('listings-demo')) || '[]';
          return new Response(data, { headers });
        }
        if (method === 'POST') {
          const body = await request.json();
          let listings = JSON.parse((await env.CONSIGNED_DATA.get('listings-demo')) || '[]');
          const newItem = {
            ...body,
            id: body.id || 'L-' + Date.now().toString(36).toUpperCase(),
            createdAt: body.createdAt || new Date().toISOString(),
          };
          listings.unshift(newItem); // newest first
          // crude limit for demo
          if (listings.length > 200) listings = listings.slice(0, 200);
          await env.CONSIGNED_DATA.put('listings-demo', JSON.stringify(listings));
          return new Response(JSON.stringify({ ok: true, item: newItem }), { status: 201, headers });
        }
      }

      if (path === '/api/orders') {
        if (method === 'GET') {
          const data = (await env.CONSIGNED_DATA.get('orders-demo')) || '[]';
          return new Response(data, { headers });
        }
        if (method === 'POST') {
          const body = await request.json();
          let orders = JSON.parse((await env.CONSIGNED_DATA.get('orders-demo')) || '[]');
          const newOrder = {
            ...body,
            id: body.id || 'ORD-' + Date.now().toString(36).toUpperCase(),
            date: body.date || new Date().toISOString(),
            status: body.status || 'Paid - Awaiting shipment',
          };
          orders.unshift(newOrder);
          if (orders.length > 100) orders = orders.slice(0, 100);
          await env.CONSIGNED_DATA.put('orders-demo', JSON.stringify(orders));
          return new Response(JSON.stringify({ ok: true, order: newOrder }), { status: 201, headers });
        }
      }

      if (path === '/api/health') {
        return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), { headers });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
  },
};