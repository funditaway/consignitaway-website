# Cloudflare Worker setup helper for Consign It Away
Write-Host "Consign It Away — Worker Setup" -ForegroundColor Cyan
Write-Host ""

if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "Step 1: Login to Cloudflare" -ForegroundColor Yellow
    Write-Host "  npx wrangler login"
    Write-Host ""
} else {
    Write-Host "CLOUDFLARE_API_TOKEN detected." -ForegroundColor Green
}

Write-Host "Step 2: Create KV namespace"
Write-Host "  npx wrangler kv namespace create CONSIGNED_DATA --config wrangler-worker.toml"
Write-Host "  Copy the 'id' into wrangler-worker.toml"
Write-Host ""

Write-Host "Step 3: Deploy Worker"
Write-Host "  npm run deploy:worker"
Write-Host ""

Write-Host "Step 4: Set secrets (optional)"
Write-Host "  npx wrangler secret put SQUARE_ACCESS_TOKEN --config wrangler-worker.toml"
Write-Host "  npx wrangler secret put EBAY_CLIENT_ID --config wrangler-worker.toml"
Write-Host "  npx wrangler secret put EBAY_CLIENT_SECRET --config wrangler-worker.toml"
Write-Host ""

Write-Host "Step 5: Configure site"
Write-Host "  Open setup.html in browser and paste your Worker URL"
Write-Host ""