# setup-atlas.ps1  (run from the project root)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
function Fail($m) { Write-Host "`n[FAIL] $m" -ForegroundColor Red; exit 1 }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }

# 1. docker-compose.yml must read MONGO_URI from .env and hold no password
Write-Host "`n[1/6] Checking docker-compose.yml"
$compose = Get-Content .\docker-compose.yml -Raw
if ($compose -match 'mongodb\+srv://[^:\s]+:[^@\s]+@') { Fail "docker-compose.yml still has a hard-coded Atlas password. Remove that line." }
if ($compose -notmatch 'MONGO_URI:\s*\$\{MONGO_URI') { Fail 'In docker-compose.yml (backend > environment) the line must be:  MONGO_URI: ${MONGO_URI:-mongodb://mongo:27017/cicd_platform}' }
docker compose config -q 2>$null
if ($LASTEXITCODE -ne 0) { Fail "docker-compose.yml is invalid YAML. Under 'environment:' every line needs exactly 6 spaces." }
Ok "docker-compose.yml is valid and has no secrets"

# 2. Create .env (UTF-8 without BOM, so Docker reads the first key correctly)
Write-Host "`n[2/6] Creating .env"
$dbUser = Read-Host "Atlas database username"
$sec    = Read-Host "Atlas database password (hidden)" -AsSecureString
$bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$pw     = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
$uri    = "mongodb+srv://$([uri]::EscapeDataString($dbUser)):$([uri]::EscapeDataString($pw))@cluster0.ymbpuyv.mongodb.net/cicd_platform?retryWrites=true&w=majority"
$jwt    = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
[IO.File]::WriteAllText((Join-Path $PSScriptRoot ".env"), "MONGO_URI=$uri`nJWT_SECRET=$jwt`n", (New-Object Text.UTF8Encoding($false)))
$pw = $null
if (-not (Test-Path .env)) { Fail ".env was not created" }
Ok ".env created at $PSScriptRoot\.env"

# 3. Restart containers
Write-Host "`n[3/6] Rebuilding containers"
docker compose down 2>&1 | Out-Null
docker compose up -d --build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed. Run 'docker compose up -d --build' to see the error." }

# 4. Wait for the backend to connect and read its log
Write-Host "`n[4/6] Waiting for the backend to connect (up to 60s)"
$log = ""
for ($i = 0; $i -lt 30; $i++) {
  $log = docker compose logs backend 2>&1 | Out-String
  if ($log -match 'Connected Host:\s+\S*mongodb\.net' -or $log -match 'Hint:') { break }
  Start-Sleep -Seconds 2
}
($log -split "`n") | Select-String "MongoDB" | ForEach-Object { Write-Host "  $($_.Line.Trim())" }
if ($log -notmatch 'Target:\s+MongoDB Atlas') {
  if ($log -match 'Docker Compose MongoDB container') { Fail ".env was not picked up (still using the local container). Run this script from the project root." }
  Fail "Could not connect to Atlas. Read the 'Hint:' line above. Most common: Atlas > Network Access must allow your IP, or the password is wrong."
}
Ok "Backend is connected to MongoDB Atlas"

# 5. Real write test through the API
Write-Host "`n[5/6] Registering a test user through the API"
$email = "dbcheck-$(Get-Date -Format yyyyMMddHHmmss)@example.com"
try {
  $body = @{ name = "DB Check"; email = $email; password = "Check1234"; department = "Test" } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/register -ContentType "application/json" -Body $body
  Ok "API created user $($r._id)"
} catch { Fail "Register request failed: $($_.Exception.Message)" }

# 6. Confirm that user is physically in Atlas (queried from inside the backend container)
Write-Host "`n[6/6] Looking for that user in the database"
$js = @'
const m = require("mongoose");
(async () => {
  await m.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const u = await m.connection.db.collection("users").findOne({ email: process.env.CHECK_EMAIL }, { projection: { password: 0 } });
  console.log(u ? "FOUND id=" + u._id + " host=" + m.connection.host + " db=" + m.connection.name : "NOT_FOUND");
  await m.disconnect();
})().catch(e => { console.log("ERROR " + e.message); process.exit(1); });
'@
$out = ($js | docker compose exec -T -e CHECK_EMAIL=$email backend node - 2>&1 | Out-String).Trim()
Write-Host "  $out"
if ($out -notmatch '^FOUND' -or $out -notmatch 'mongodb\.net') { Fail "User was not found in Atlas." }

Write-Host "`nSUCCESS: the app now stores data in Atlas." -ForegroundColor Green
Write-Host "In Compass, connect with your Atlas connection string (not localhost), open database 'cicd_platform' > collection 'users', and filter:  { `"email`": `"$email`" }"
Write-Host "Refresh the sidebar if it does not appear. You can delete that test user in Compass afterwards."