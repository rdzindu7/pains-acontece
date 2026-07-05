# Pains Acontece — Setup automático completo
# Uso:
#   .\scripts\setup-all.ps1 -DbPassword "senha_banco" -SecretKey "sb_secret_..."
# Senha DB: Supabase → Settings → Database → Database password
# Secret:  Supabase → Settings → API → Secret keys → default

param(
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD,
  [string]$SecretKey = $env:SUPABASE_SECRET_KEY
)

$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host "=== Pains Acontece — Setup Automático ===" -ForegroundColor Green

# Dependências Node (postgres para schemas)
if (-not (Test-Path "node_modules\postgres")) {
  Write-Host "`n[1/4] Instalando dependências…" -ForegroundColor Cyan
  npm install --silent 2>$null
  if ($LASTEXITCODE -ne 0) { npm install }
} else {
  Write-Host "`n[1/4] Dependências OK" -ForegroundColor Green
}

# Schemas SQL (perfis, selo, RPC admin_set_verified)
if ($DbPassword) {
  Write-Host "`n[2/4] Aplicando schemas SQL…" -ForegroundColor Cyan
  $env:SUPABASE_DB_PASSWORD = $DbPassword
  node scripts/apply-all-schemas.mjs
  if ($LASTEXITCODE -ne 0) { Write-Host "AVISO: schemas não aplicados" -ForegroundColor Yellow }
} else {
  Write-Host "`n[2/4] Schemas — pulado (passe -DbPassword)" -ForegroundColor Yellow
}

# Usuário admin Supabase
if ($SecretKey) {
  Write-Host "`n[3/4] Configurando admin Supabase…" -ForegroundColor Cyan
  & "$PSScriptRoot\setup-supabase.ps1" -SecretKey $SecretKey
} else {
  Write-Host "`n[3/4] Admin — pulado (passe -SecretKey)" -ForegroundColor Yellow
}

# Sync artigos → articles.json
Write-Host "`n[4/4] Sincronizando artigos publicados…" -ForegroundColor Cyan
node scripts/sync-articles.mjs
if ($LASTEXITCODE -eq 0) {
  Write-Host "OK — data/articles.json atualizado" -ForegroundColor Green
} else {
  Write-Host "AVISO: sync falhou (publique notícias no admin primeiro)" -ForegroundColor Yellow
}

Write-Host "`n=== Concluído ===" -ForegroundColor Green
Write-Host "GitHub Actions sincroniza artigos a cada 30 min automaticamente."
Write-Host "Adicione secrets no GitHub (opcional, melhora CI):"
Write-Host "  SUPABASE_URL, SUPABASE_ANON_KEY"
Write-Host "Site: https://rdzindu7.github.io/pains-acontece/"