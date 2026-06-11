# Updates Cloudflare DNS for consignitaway.com to point to GitHub Pages
# Usage: $env:CLOUDFLARE_API_TOKEN = "your-token"; .\deploy-dns.ps1

param(
    [string]$ZoneName = "consignitaway.com",
    [string]$Token = $env:CLOUDFLARE_API_TOKEN
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
    content = "funditaway.github.io"
    proxied = $false
    ttl = 1
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Body $wwwBody | Out-Null
Write-Host "Added CNAME: www -> funditaway.github.io (DNS only)"
Write-Host ""
Write-Host "DNS updated! Site should be live at https://consignitaway.com within 5-10 minutes."
Write-Host "Enable HTTPS in GitHub: Settings > Pages > Enforce HTTPS"