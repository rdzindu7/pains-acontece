# Pains Acontece — Setup automático Supabase
# Uso: .\scripts\setup-supabase.ps1 -ServiceRoleKey "sua_chave_service_role"
#
# Pegue a chave em: Supabase Dashboard → Settings → API → service_role (secret)

param(
  [Parameter(Mandatory = $true)]
  [string]$ServiceRoleKey
)

$ProjectUrl = "https://blcomwofpyorypqjdhfb.supabase.co"
$AdminEmail = "admin@painsacontece.com.br"
$AdminPass  = "Pains@2026"

$headers = @{
  apikey        = $ServiceRoleKey
  Authorization = "Bearer $ServiceRoleKey"
  "Content-Type" = "application/json"
}

Write-Host "=== Pains Acontece — Setup Supabase ===" -ForegroundColor Green

# 1. Criar usuário admin
Write-Host "`n[1/2] Criando usuário admin..." -ForegroundColor Cyan
$body = @{
  email         = $AdminEmail
  password      = $AdminPass
  email_confirm = $true
} | ConvertTo-Json

try {
  $user = Invoke-RestMethod -Uri "$ProjectUrl/auth/v1/admin/users" -Method POST -Headers $headers -Body $body
  Write-Host "OK — Admin criado: $($user.email)" -ForegroundColor Green
} catch {
  $err = $_.ErrorDetails.Message
  if ($err -match "already|exists|registered") {
    Write-Host "OK — Admin já existe, atualizando senha..." -ForegroundColor Yellow
    try {
      $list = Invoke-RestMethod -Uri "$ProjectUrl/auth/v1/admin/users?email=$AdminEmail" -Method GET -Headers $headers
      $uid = $list.users[0].id
      $upd = @{ password = $AdminPass; email_confirm = $true } | ConvertTo-Json
      Invoke-RestMethod -Uri "$ProjectUrl/auth/v1/admin/users/$uid" -Method PUT -Headers $headers -Body $upd | Out-Null
      Write-Host "OK — Senha atualizada" -ForegroundColor Green
    } catch {
      Write-Host "AVISO: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
  } else {
    Write-Host "ERRO: $err" -ForegroundColor Red
    exit 1
  }
}

# 2. Verificar tabelas
Write-Host "`n[2/2] Verificando tabelas..." -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "$ProjectUrl/rest/v1/articles?select=id&limit=1" -Method GET -Headers $headers | Out-Null
  Write-Host "OK — Tabelas existem" -ForegroundColor Green
} catch {
  Write-Host "AVISO — Tabelas não encontradas." -ForegroundColor Yellow
  Write-Host "Execute supabase/schema.sql no SQL Editor do Supabase:" -ForegroundColor Yellow
  Write-Host "  https://supabase.com/dashboard/project/blcomwofpyorypqjdhfb/sql/new" -ForegroundColor White
}

Write-Host "`n=== Concluído ===" -ForegroundColor Green
Write-Host "Login: $AdminEmail / $AdminPass"
Write-Host "Site:  https://rdzindu7.github.io/pains-acontece/pages/login.html"