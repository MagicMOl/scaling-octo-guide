# 本地起 BFF（Windows PowerShell）
# 用法： .\server\run-local.ps1 -Key "sk-你的key"
param([string]$Key = $env:DEEPSEEK_API_KEY, [int]$Port = 8787)

Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

if (-not $Key) {
    Write-Host "没有给 Key。用 -Key 传入，或先设置环境变量 DEEPSEEK_API_KEY。" -ForegroundColor Yellow
    Read-Host "回车退出"
    exit 1
}

$env:DEEPSEEK_API_KEY = $Key
$env:PORT = "$Port"

$node = "node"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "找不到 node，请先安装 Node 18+。" -ForegroundColor Red
    Read-Host "回车退出"
    exit 1
}

Write-Host "启动 BFF：http://localhost:$Port" -ForegroundColor Cyan
Write-Host "然后把原型「设置」里的服务地址填成：http://localhost:$Port/api/chat" -ForegroundColor Gray
Write-Host ""
& $node "server/node-server.mjs"
