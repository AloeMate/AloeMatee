# Download Pre-trained Model Script
# This script downloads the trained EfficientNetV2-S model for AloeVeraMate

$modelUrl = "YOUR_MODEL_URL_HERE"  # TODO: Replace with actual URL
$modelPath = "model.pt"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AloeVeraMate Model Downloader" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if (Test-Path $modelPath) {
    Write-Host "⚠ model.pt already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "✓ Keeping existing model" -ForegroundColor Green
        exit 0
    }
}

Write-Host "📥 Downloading model (~78 MB)..." -ForegroundColor Yellow
Write-Host "URL: $modelUrl`n" -ForegroundColor Gray

# TODO: Uncomment and update URL
# Invoke-WebRequest -Uri $modelUrl -OutFile $modelPath -UseBasicParsing

Write-Host "`n" -ForegroundColor Red
Write-Host "⚠ SETUP REQUIRED:" -ForegroundColor Red
Write-Host "  1. Upload model.pt to cloud storage (Google Drive, Dropbox, etc.)" -ForegroundColor White
Write-Host "  2. Get public download link" -ForegroundColor White
Write-Host "  3. Update `$modelUrl in this script" -ForegroundColor White
Write-Host "  4. Uncomment the Invoke-WebRequest line" -ForegroundColor White
Write-Host "`nFor now, copy model.pt manually from your trained model location.`n" -ForegroundColor Yellow
