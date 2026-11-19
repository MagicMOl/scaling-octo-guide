# 部署到 Cloudflare Workers
# 用法： .\server\deploy-cloudflare.ps1
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

Write-Host "1/3 检查 wrangler…" -ForegroundColor Cyan
$hasWrangler = $true
try { npx --no-install wrangler --version | Out-Null } catch { $hasWrangler = $false }
if (-not $hasWrangler) {
    Write-Host "   没装 wrangler，先执行一次：npm i -D wrangler" -ForegroundColor Yellow
}

Write-Host "2/3 登录 Cloudflare（会开浏览器）…" -ForegroundColor Cyan
npx wrangler login

Write-Host "3/3 设置密钥并部署…" -ForegroundColor Cyan
Write-Host "   接下来会提示你粘贴 DEEPSEEK_API_KEY（不会显示、不会写进文件）" -ForegroundColor Gray
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler deploy

Write-Host ""
Write-Host "部署完成。把输出里的 https://<名字>.<账号>.workers.dev 加 /api/chat" -ForegroundColor Green
Write-Host "填到原型「设置 → 服务地址」即可。" -ForegroundColor Green
Read-Host "回车关闭"
