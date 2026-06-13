/**
 * Marketplace Connectors for Consign It Away
 *
 * Consign It Away's value: Users consign once. Our system (with AI-like rules for now)
 * picks the best platforms based on category, price, condition, etc., and lists/synces via official APIs.
 *
 * Each connector implements:
 *   - publishListing(listing, accessToken, env) -> { platformId, status, ... }
 *   - syncOrders(accessToken, env) -> array of normalized orders
 *   - updateInventory(sku, quantity, accessToken) [optional]
 *
 * Credentials (OAuth tokens) are stored server-side in KV by the main worker.
 * Never expose refresh tokens to frontend.
 */

export const MarketplaceConnectors = {
  ebay: {
    name: 'eBay',

    async publishListing(listing, accessToken, env = {}) {
      if (!accessToken) throw new Error('No eBay access token');

      const marketplaceId = 'EBAY_US'; // or EBAY_GB etc. based on seller
      const sku = listing.sku || listing.id;

      // 1. Create / Update Inventory Item (product details)
      const inventoryItem = {
        availability: {
          shipToLocationAvailability: {
            quantity: listing.quantity || 1
          }
        },
        product: {
          title: listing.name,
          description: listing.fullDescription || listing.description || listing.name,
          aspects: this.mapAspects(listing),
          imageUrls: this.getImageUrls(listing),
          mpn: listing.sku || undefined
        },
        condition: this.mapCondition(listing.condition),
        conditionDescription: listing.condition || 'Used'
      };

      const itemRes = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': marketplaceId
        },
        body: JSON.stringify(inventoryItem)
      });

      if (!itemRes.ok) {
        const err = await itemRes.text();
        throw new Error(`eBay inventory item failed: ${err}`);
      }

      // 2. Create Offer (price, marketplace, quantity)
      const price = parseFloat(listing.price) || 0;
      const offer = {
        sku,
        marketplaceId,
        format: 'FIXED_PRICE',
        availableQuantity: listing.quantity || 1,
        pricingSummary: {
          price: {
            value: price.toFixed(2),
            currency: 'USD'
          }
        },
        categoryId: this.mapCategoryToEbay(listing.categories?.[0] || 'collectibles'), // rough mapping
        listingPolicies: {
          fulfillmentPolicyId: env.EBAY_FULFILLMENT_POLICY_ID || undefined, // user must configure policies
          paymentPolicyId: env.EBAY_PAYMENT_POLICY_ID || undefined,
          returnPolicyId: env.EBAY_RETURN_POLICY_ID || undefined
        }
      };

      const offerRes = await fetch('https://api.ebay.com/sell/inventory/v1/offer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': marketplaceId
        },
        body: JSON.stringify(offer)
      });

      if (!offerRes.ok) {
        const err = await offerRes.text();
        throw new Error(`eBay offer creation failed: ${err}`);
      }

      const offerData = await offerRes.json();
      const offerId = offerData.offerId;

      // 3. Publish the offer (makes it live)
      const publishRes = await fetch(`https://api.ebay.com/sell/inventory/v1/offer/${offerId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': marketplaceId
        }
      });

      if (!publishRes.ok) {
        const err = await publishRes.text();
        throw new Error(`eBay publish failed: ${err}`);
      }

      const publishData = await publishRes.json();

      return {
        platformId: `ebay-${offerId}`,
        status: 'live',
        listingUrl: publishData.listingUrl || `https://www.ebay.com/itm/${sku}`,
        offerId,
        raw: publishData
      };
    },

    async syncOrders(accessToken, env = {}) {
      if (!accessToken) return [];

      const marketplaceId = 'EBAY_US';
      // Get recent orders (last 30 days example)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const ordersRes = await fetch(
        `https://api.ebay.com/sell/fulfillment/v1/order?filter=creationdate:[${thirtyDaysAgo}..]&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-EBAY-C-MARKETPLACE-ID': marketplaceId
          }
        }
      );

      if (!ordersRes.ok) {
        console.error('eBay order sync failed');
        return [];
      }

      const data = await ordersRes.json();
      const orders = data.orders || [];

      // Normalize to internal format
      return orders.map(order => ({
        id: `ebay-${order.orderId}`,
        platform: 'ebay',
        platformOrderId: order.orderId,
        date: order.creationDate,
        status: this.mapEbayOrderStatus(order.orderFulfillmentStatus),
        total: parseFloat(order.pricingSummary?.total?.value || 0),
        buyer: {
          name: order.buyer?.username || 'eBay Buyer',
          address: order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress ?
            `${order.fulfillmentStartInstructions[0].shippingStep.shipTo.contactAddress.addressLine1}, ${order.fulfillmentStartInstructions[0].shippingStep.shipTo.contactAddress.city}` : 'Address on eBay'
        },
        items: (order.lineItems || []).map(li => ({
          name: li.title,
          price: parseFloat(li.total?.value || 0),
          quantity: li.quantity || 1,
          sku: li.sku
        })),
        raw: order
      }));
    },

    async updateInventory(sku, quantity, accessToken) {
      if (!accessToken || !sku) return;
      // Use Inventory Item API to update availability
      const res = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PATCH', // or PUT with partial
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        },
        body: JSON.stringify({
          availability: {
            shipToLocationAvailability: { quantity }
          }
        })
      });
      return res.ok;
    },

    // Helpers
    mapCondition(condition) {
      const map = {
        'New': 'NEW',
        'Like New': 'LIKE_NEW',
        'Very Good': 'VERY_GOOD',
        'Good': 'GOOD',
        'Acceptable': 'ACCEPTABLE',
        'Collectible': 'USED_EXCELLENT'
      };
      return map[condition] || 'USED';
    },

    mapAspects(listing) {
      const aspects = {};
      if (listing.categories?.length) aspects['Category'] = listing.categories;
      if (listing.condition) aspects['Condition'] = [listing.condition];
      // Add more mappings based on your internal data (color, size, brand etc.)
      return aspects;
    },

    getImageUrls(listing) {
      if (listing.photos && Array.isArray(listing.photos)) return listing.photos.slice(0, 12);
      if (listing.image) return [listing.image];
      return [];
    },

    mapCategoryToEbay(cat) {
      // Rough mapping - expand with real eBay category IDs from their taxonomy
      const map = {
        'clothing': '11450',
        'electronics': '293',
        'collectibles': '1',
        'auto': '6001',
        'books': '267'
      };
      return map[cat] || '1'; // default
    },

    mapEbayOrderStatus(status) {
      if (status === 'FULFILLED') return 'Shipped';
      if (status === 'IN_PROGRESS') return 'Paid - Awaiting shipment';
      return 'Pending';
    }
  },

  // Stubs for other platforms (expand similarly)
  amazon: { /* ... SP-API with LWA OAuth ... */ name: 'Amazon', async publishListing() { return { status: 'requires_sp_api_setup' }; }, async syncOrders() { return []; } },
  etsy: { /* Etsy v3 API with OAuth */ name: 'Etsy', async publishListing(listing, token) { /* similar using /v3/application/listings */ return { platformId: 'etsy-' + Date.now(), status: 'listed' }; } },
  facebook: { name: 'Facebook / Instagram', async publishListing() { return { status: 'feed_or_shops_api_recommended' }; } },
  whatnot: { name: 'Whatnot', async publishListing() { return { status: 'partnership_or_manual' }; } },
  internal: {
    name: 'ConsignItAway Store',
    async publishListing(listing) { return { platformId: listing.id, status: 'live_on_site' }; }
  }
};

/**
 * AI / Rule-based platform picker (Consign It Away's "AI")
 * Picks best platforms based on category, price, condition.
 * In production, this could call an LLM or use ML model.
 */
export function suggestPlatforms(listing) {
  const suggestions = ['internal'];
  const price = parseFloat(listing.price) || 0;
  const cat = (listing.categories || [])[0] || '';
  const condition = listing.condition || '';

  // High value or collectibles -> eBay
  if (price > 50 || ['collectibles', 'auto'].includes(cat)) {
    suggestions.push('ebay');
  }

  // Electronics, good condition -> Amazon
  if (['electronics', 'appliances'].includes(cat) && ['New', 'Like New'].includes(condition)) {
    suggestions.push('amazon');
  }

  // Clothing, mid price -> Facebook / Etsy
  if (cat === 'clothing' && price < 100) {
    suggestions.push('facebook');
  }

  // Vintage / unique -> Etsy
  if (condition === 'Collectible' || cat === 'crafts') {
    suggestions.push('etsy');
  }

  // Always suggest internal store
  return [...new Set(suggestions)];
}
