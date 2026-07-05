# Publicar Pains Acontece no GitHub Pages
# Execute: clique direito > Executar com PowerShell

$git = "C:\Program Files\Git\bin\git.exe"
$gh  = "C:\Program Files\GitHub CLI\gh.exe"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location $dir

Write-Host ""
Write-Host "  PAINS ACONTECE - Publicar no GitHub" -ForegroundColor Green
Write-Host ""

# Verificar login
$auth = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Primeiro, faca login no GitHub..." -ForegroundColor Yellow
    & $gh auth login -w -p https
    if ($LASTEXITCODE -ne 0) { Write-Host "Login cancelado." -ForegroundColor Red; pause; exit 1 }
}

$repoName = Read-Host "  Nome do repositorio (ex: pains-acontece)"
if (-not $repoName) { $repoName = "pains-acontece" }

Write-Host ""
Write-Host "  Criando repositorio $repoName ..." -ForegroundColor Cyan

& $gh repo create $repoName --public --source=. --remote=origin --push --description "Portal de noticias de Pains e regiao - Pains Acontece"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  Repositorio criado e codigo enviado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Ative o GitHub Pages:" -ForegroundColor Yellow
    Write-Host "  1. Abra: https://github.com/SEU-USUARIO/$repoName/settings/pages"
    Write-Host "  2. Source: Deploy from branch"
    Write-Host "  3. Branch: main / (root)"
    Write-Host "  4. Salvar"
    Write-Host ""
    Write-Host "  Site ficara em: https://SEU-USUARIO.github.io/$repoName/" -ForegroundColor Cyan
    & $gh repo view --web
} else {
    Write-Host "  Erro ao criar. O repo ja existe? Tente:" -ForegroundColor Red
    Write-Host "  git remote add origin https://github.com/SEU-USUARIO/$repoName.git"
    Write-Host "  git push -u origin main"
}

Write-Host ""
pause