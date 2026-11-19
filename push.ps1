# 一键推送到 GitHub
# 用法：
#   双击（无参数）：会打开 github.com/new，建好后把地址粘进来
#   或命令行： .\push.ps1 -Repo https://github.com/<用户名>/<仓库名>.git

param([string]$Repo)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not $Repo) {
    Write-Host "先在浏览器里新建一个空仓库（不要勾 README / .gitignore / License）。" -ForegroundColor Cyan
    Start-Process "https://github.com/new"
    Write-Host ""
    $Repo = Read-Host "把仓库地址粘进来（形如 https://github.com/用户名/25-dipian.git）"
}

$Repo = $Repo.Trim()
if ($Repo -notmatch '^https://github\.com/.+/.+(\.git)?$') {
    Write-Host "地址看起来不对：$Repo" -ForegroundColor Red
    Write-Host "应该形如 https://github.com/用户名/25-dipian.git"
    Read-Host "回车关闭"
    exit 1
}
if ($Repo -notmatch '\.git$') { $Repo = $Repo + '.git' }

Write-Host ""
Write-Host "将要推送：" -ForegroundColor Cyan
git log --oneline --decorate | Select-Object -First 5
Write-Host ""
Write-Host "远端：$Repo"

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $existing) {
    git remote set-url origin $Repo
    Write-Host "已更新 origin"
} else {
    git remote add origin $Repo
    Write-Host "已添加 origin"
}

Write-Host ""
Write-Host "开始推送（第一次会弹出浏览器让你登录 GitHub）…" -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "推送失败。常见原因：仓库名写错、没有权限、或网络问题。" -ForegroundColor Red
    Read-Host "回车关闭"
    exit 1
}
git push origin --tags

Write-Host ""
Write-Host "推送完成。" -ForegroundColor Green
Write-Host ""
Write-Host "下一步开 Pages（让原型能在线打开）："
Write-Host "  1. 打开 $($Repo -replace '\.git$','')/settings/pages"
Write-Host "  2. Source 选 Deploy from a branch，分支 main，目录 / (root)，保存"
Write-Host "  3. 一分钟左右访问 https://<用户名>.github.io/<仓库名>/"
Write-Host ""
Read-Host "回车关闭"
