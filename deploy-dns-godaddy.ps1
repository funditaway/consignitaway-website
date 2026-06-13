# GoDaddy DNS setup for consignitaway.com -> GitHub Pages
# Get API key/secret: https://developer.godaddy.com/keys
# Usage:
#   $env:GODADDY_API_KEY = "your-key"
#   $env:GODADDY_API_SECRET = "your-secret"
#   .\deploy-dns-godaddy.ps1

param([string]$Domain = "consignitaway.com")

$key = $env:GODADDY_API_KEY
$secret = $env:GODADDY_API_SECRET

if (-not $key -or -not $secret) {
    Write-Host "Set GODADDY_API_KEY and GODADDY_API_SECRET environment variables."
    Write-Host ""
    Write-Host "Manual DNS records to add in GoDaddy:"
    Write-Host "  Delete old A record pointing to 63.141.128.12"
    Write-Host "  Add A @ 185.199.108.153"
    Write-Host "  Add A @ 185.199.109.153"
    Write-Host "  Add A @ 185.199.110.153"
    Write-Host "  Add A @ 185.199.111.153"
    Write-Host "  Add CNAME www funditaway.github.io"
    exit 1
}

$headers = @{
    Authorization = "sso-key ${key}:${secret}"
    "Content-Type" = "application/json"
}

$records = @(
    @{ type = "A"; name = "@"; data = "185.199.108.153"; ttl = 600 },
    @{ type = "A"; name = "@"; data = "185.199.109.153"; ttl = 600 },
    @{ type = "A"; name = "@"; data = "185.199.110.153"; ttl = 600 },
    @{ type = "A"; name = "@"; data = "185.199.111.153"; ttl = 600 },
    @{ type = "CNAME"; name = "www"; data = "funditaway.github.io"; ttl = 600 }
)

$body = $records | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.godaddy.com/v1/domains/$Domain/records" -Method Put -Headers $headers -Body $body
Write-Host "GoDaddy DNS updated for $Domain"
Write-Host "Enable HTTPS in GitHub: Settings > Pages > Enforce HTTPS"