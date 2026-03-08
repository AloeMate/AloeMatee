# AloeVeraMate - Full Stack Startup Script
# Starts both Backend (FastAPI) and Frontend (Expo)

# Get the root directory (where this script is located)
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ALOEVERAMATE - STARTING FULL STACK" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Working Directory: $rootDir`n" -ForegroundColor Gray

# Step 1: Start Backend Server
Write-Host "[SERVER] Starting Backend Server..." -ForegroundColor Yellow
$backendPath = Join-Path $rootDir "apps\server"
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    python run.py
} -ArgumentList $backendPath
Write-Host "   Backend started (Job ID: $($backendJob.Id))" -ForegroundColor Gray

# Step 2: Wait for Backend Health Check
Write-Host "`n[WAIT] Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

try {
    $health = Invoke-WebRequest http://localhost:8000/health -UseBasicParsing | ConvertFrom-Json
    Write-Host "`n[OK] Backend Server: RUNNING" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor Cyan
    Write-Host "  Version: $($health.version)" -ForegroundColor Cyan
    Write-Host "  Port: 8000" -ForegroundColor Cyan
    Write-Host "  Aloe Vera Detection: ENABLED" -ForegroundColor Yellow
} catch {
    Write-Host "`n[WARNING] Backend health check failed, but continuing..." -ForegroundColor Yellow
}

# Step 3: Start Frontend Mobile App
Write-Host "`n[MOBILE] Starting Mobile App (Expo)..." -ForegroundColor Yellow
$mobilePath = Join-Path $rootDir "apps\mobile"
Set-Location $mobilePath

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   BOTH SYSTEMS READY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: Starting Expo...`n" -ForegroundColor Cyan

# Start Expo (this will keep running in foreground)
npx expo start --clear

# Cleanup when Expo exits (Ctrl+C)
Write-Host "`n[STOP] Stopping backend server..." -ForegroundColor Yellow
Stop-Job -Id $backendJob.Id
Remove-Job -Id $backendJob.Id
Write-Host "[OK] All services stopped" -ForegroundColor Green
