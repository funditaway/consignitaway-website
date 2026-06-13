# Updates Cloudflare DNS for consignitaway.com to point to GitHub Pages
# Usage: $env:CLOUDFLARE_API_TOKEN = "your-token"; .\deploy-dns.ps1

param(
    [string]$ZoneName = "consignitaway.com",
    [string]$Token = $env:CLOUDFLARE_API_TOKEN,
    # For GitHub Pages: the user/org .github.io target for this repo.
    # From git remote this project uses funditaway.github.io (project page under that org).
    # Do NOT include https:// or repo name; GH Pages + custom domain in repo settings handles it.
    [string]$GitHubTarget = "funditaway.github.io"
)

if (-not $Token) {
    Write-Error "Set CLOUDFLARE_API_TOKEN environment variable first."
    Write-Host "Create token at: https://dash.cloudflare.com/profile/api-tokens"
    Write-Host "Required permissions: Zone > DNS > Edit"
    exit 1
}

$headers = @{
    Authorization = "Bearer $Token"
    "Content-Type" = "application/json"
}

$zone = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones?name=$ZoneName" -Headers $headers
$zoneId = $zone.result[0].id

if (-not $zoneId) {
    Write-Error "Zone not found: $ZoneName"
    exit 1
}

Write-Host "Zone ID: $zoneId"

$records = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers

foreach ($record in $records.result) {
    if ($record.name -eq $ZoneName -or $record.name -eq "www.$ZoneName") {
        Write-Host "Deleting: $($record.type) $($record.name) -> $($record.content)"
        Invoke-RestMethod -Method Delete -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$($record.id)" -Headers $headers | Out-Null
    }
}

$githubIps = @("185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153")

foreach ($ip in $githubIps) {
    $body = @{
        type = "A"
        name = "@"
        content = $ip
        proxied = $false
        ttl = 1
    } | ConvertTo-Json

    Invoke-RestMethod -Method Post -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Body $body | Out-Null
    Write-Host "Added A record: @ -> $ip (DNS only)"
}

$wwwBody = @{
    type = "CNAME"
    name = "www"
    content = $GitHubTarget
    proxied = $false
    ttl = 1
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Body $wwwBody | Out-Null
Write-Host "Added CNAME: www -> $GitHubTarget (DNS only)"
Write-Host ""
Write-Host "DNS updated! Site should be live at https://consignitaway.com within 5-10 minutes (propagation may take longer)."
Write-Host "If using GitHub Pages: In repo Settings > Pages, add custom domain consignitaway.com , select the branch, and enforce HTTPS."
Write-Host "If using Cloudflare Pages instead: Point DNS (CNAME www + apex) to your <your-project>.pages.dev hostname. CF Pages handles HTTPS automatically."