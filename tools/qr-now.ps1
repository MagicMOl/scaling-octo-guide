# 生成当前网络下可用的手机预览二维码
# 用法： .\tools\qr-now.ps1            （默认 8090 端口，原型）
#        .\tools\qr-now.ps1 -Port 8088  （作品集）
param([int]$Port = 8090)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

$out = ipconfig 2>&1 | Out-String
$ips = [regex]::Matches($out, 'IPv4[^:：]*[:：]\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)') |
    ForEach-Object { $_.Groups[1].Value } |
    Where-Object { $_ -notlike '127.*' -and $_ -notlike '169.254.*' } |
    Select-Object -Unique

if (-not $ips) {
    Write-Host "没有找到局域网 IPv4，先确认电脑已连上 Wi-Fi 或热点。" -ForegroundColor Red
    exit 1
}

foreach ($ip in $ips) {
    $url = "http://${ip}:${Port}/"
    Write-Host $url -ForegroundColor Cyan
    $png = Join-Path (Get-Location) ("crops9\qr-" + $ip.Replace('.', '-') + ".png")
    New-Item -ItemType Directory -Force -Path (Split-Path $png) | Out-Null
    $api = "https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=" + [uri]::EscapeDataString($url)
    try {
        Invoke-WebRequest -Uri $api -OutFile $png -UseBasicParsing -TimeoutSec 20
        Write-Host ("  二维码 -> " + $png) -ForegroundColor Gray
    } catch {
        Write-Host "  二维码下载失败（不影响使用，直接输地址即可）" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "手机与电脑要在同一个网络（同一个 Wi-Fi，或电脑连手机热点）。" -ForegroundColor Gray
