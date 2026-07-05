# Pains Acontece — Setup automático Supabase
# Uso: .\scripts\setup-supabase.ps1 -SecretKey "sb_secret_..."
#
# Pegue em: Supabase Dashboard → Settings → API → Secret keys → default (olho + copiar)

param(
  [Parameter(Mandatory = $true)]
  [string]$SecretKey
)

$ProjectUrl = "https://blcomwofpyorypqjdhfb.supabase.co"
$AdminEmail = "admin@painsacontece.com.br"
$AdminPass  = "Pains@2026"

$jsonUser = Join-Path $env:TEMP "pa-supabase-user.json"
[System.IO.File]::WriteAllText($jsonUser, (@{
  email = $AdminEmail; password = $AdminPass; email_confirm = $true
} | ConvertTo-Json -Compress))

Write-Host "=== Pains Acontece — Setup Supabase ===" -ForegroundColor Green

# 1. Criar usuário admin (curl evita bloqueio "browser")
Write-Host "`n[1/2] Criando usuário admin..." -ForegroundColor Cyan
$create = curl.exe -s -w "`n%{http_code}" -X POST "$ProjectUrl/auth/v1/admin/users" `
  -H "apikey: $SecretKey" -H "Authorization: Bearer $SecretKey" `
  -H "Content-Type: application/json" -H "User-Agent: pains-acontece-setup/1.0" `
  --data-binary "@$jsonUser"
$code = ($create -split "`n")[-1]
$resp = ($create -split "`n")[0..-2] -join "`n"
if ($code -eq "200") {
  Write-Host "OK — Admin criado" -ForegroundColor Green
} elseif ($resp -match "already|exists|registered") {
  Write-Host "OK — Admin já existe" -ForegroundColor Yellow
} else {
  Write-Host "Resposta ($code): $resp" -ForegroundColor Yellow
}

# 2. Verificar tabelas
Write-Host "`n[2/2] Verificando tabelas..." -ForegroundColor Cyan
$check = curl.exe -s -w "`n%{http_code}" "$ProjectUrl/rest/v1/articles?select=id&limit=1" `
  -H "apikey: $SecretKey" -H "Authorization: Bearer $SecretKey" -H "User-Agent: pains-acontece-setup/1.0"
$tcode = ($check -split "`n")[-1]
if ($tcode -eq "200") {
  Write-Host "OK — Tabelas existem" -ForegroundColor Green
} else {
  Write-Host "AVISO — Execute schema.sql no SQL Editor:" -ForegroundColor Yellow
  Write-Host "  https://supabase.com/dashboard/project/blcomwofpyorypqjdhfb/sql/new" -ForegroundColor White
}

Write-Host "`n=== Concluído ===" -ForegroundColor Green
Write-Host "Login: $AdminEmail / $AdminPass"
Write-Host "Site:  https://rdzindu7.github.io/pains-acontece/pages/login.html"