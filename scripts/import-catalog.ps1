# Imports products from legacy X-Cart XML export into js/products-catalog.json
param(
    [string]$XmlPath = "C:\Users\consi\Downloads\products-2020-11-19.xml",
    [string]$OutPath = "$PSScriptRoot\..\js\products-catalog.json"
)

function Map-Category($names) {
    $s = ($names -join ' ').ToLower()
    if ($s -match 'auto|motorcycle|atv|parts|exhaust|engine|windshield|footrest|handlebar|seat') { return 'auto' }
    if ($s -match 'cloth|jewelry|shoe') { return 'clothing' }
    if ($s -match 'book') { return 'books' }
    if ($s -match 'baby') { return 'baby' }
    if ($s -match 'electronic|computer|phone') { return 'electronics' }
    if ($s -match 'kitchen|dining|home decor|furniture|garden') { return 'dining' }
    if ($s -match 'craft|sewing|handmade|art|fabric') { return 'crafts' }
    if ($s -match 'office|stapler') { return 'office' }
    if ($s -match 'sport|outdoor|fitness|hammer strength') { return 'appliances' }
    return 'collectibles'
}

function Map-Condition($raw) {
    switch -Regex ($raw.ToLower()) {
        'new' { 'New' }
        'like' { 'Like New' }
        'very' { 'Very Good' }
        'collect' { 'Collectible' }
        'accept' { 'Acceptable' }
        default { 'Good' }
    }
}

[xml]$doc = Get-Content $XmlPath -Encoding UTF8
$items = @()

foreach ($p in $doc.products.product) {
    if ($p.Product_Visible.'#cdata-section' -ne 'Y') { continue }
    if ($p.Allow_Purchases.'#cdata-section' -ne 'Y') { continue }

    $price = [double]($p.Calculated_Price.'#cdata-section')
    if ($price -le 0) { continue }

    $cats = @()
    if ($p.Category_Details.item) {
        foreach ($item in $p.Category_Details.item) {
            $n = $item.Category_Name.'#cdata-section'
            if ($n -and $n -ne 'Shop All') { $cats += $n }
        }
    }

    $images = @()
    if ($p.Images.item) {
        foreach ($img in $p.Images.item) {
            $url = $img.Image_URL.'#cdata-section'
            if ($url) { $images += $url }
        }
    }

    $desc = ($p.Description.'#cdata-section' -replace '\s+', ' ').Trim()
    if ($desc.Length -gt 300) { $desc = $desc.Substring(0, 300) }

    $items += [ordered]@{
        id = [int]($p.Product_ID.'#cdata-section')
        sku = $p.Code.'#cdata-section'
        name = ($p.Name.'#cdata-section' -replace '\s+', ' ').Trim()
        category = Map-Category $cats
        categories = $cats
        price = $price
        condition = Map-Condition ($p.Product_Condition.'#cdata-section')
        description = $desc
        image = if ($images.Count) { $images[0] } else { $null }
        photos = $images
        shipping = ($p.Free_Shipping.'#cdata-section' -eq 'Y')
        stock = [int]($p.Stock_Level.'#cdata-section')
        slug = $p.Product_URL.'#cdata-section'
        source = 'catalog'
    }
}

$json = $items | ConvertTo-Json -Depth 6
Set-Content -Path $OutPath -Value $json -Encoding UTF8
Write-Host "Imported $($items.Count) products -> $OutPath"