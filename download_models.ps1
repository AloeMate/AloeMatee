# Download Large Model Files
# These files are excluded from git due to size

Write-Host "📦 AloeVeraMate - Model Download Script" -ForegroundColor Cyan
Write-Host ""

$modelsToDownload = @(
    @{
        Name = "Disease Detection Model"
        Size = "77.81 MB"
        Path = "apps\server\artifacts\model.pt"
        Required = $true
        Component = "Component 1 (Disease Detection)"
        Description = "EfficientNetV2-S model for identifying 6 aloe vera diseases"
    },
    @{
        Name = "Harvest ML Model"
        Size = "38.98 MB"
        Path = "apps\server\app\ml_models\harvest_model.h5"
        Required = $false
        Component = "Component 4 (ML Demo - Optional)"
        Description = "EfficientNetB0 model for maturity assessment demo"
    }
)

Write-Host "⚠️  IMPORTANT: Large model files must be downloaded separately" -ForegroundColor Yellow
Write-Host ""
Write-Host "These files are excluded from git because:" -ForegroundColor Gray
Write-Host "  • They exceed GitHub's 100MB file size limit" -ForegroundColor Gray
Write-Host "  • Git is not optimized for large binary files" -ForegroundColor Gray
Write-Host "  • Reduces repository clone size significantly" -ForegroundColor Gray
Write-Host ""

foreach ($model in $modelsToDownload) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "📋 $($model.Name)" -ForegroundColor Cyan
    Write-Host "   Size: $($model.Size)"
    Write-Host "   Path: $($model.Path)"
    Write-Host "   Required: $(if($model.Required){'✅ Yes'}else{'⚠️  Optional'})"
    Write-Host "   Component: $($model.Component)"
    Write-Host "   Description: $($model.Description)" -ForegroundColor Gray
    Write-Host ""
    
    $fullPath = Join-Path $PSScriptRoot $model.Path
    
    if (Test-Path $fullPath) {
        $size = (Get-Item $fullPath).Length / 1MB
        Write-Host "   Status: ✅ Already downloaded ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "   Status: ❌ NOT FOUND - Download required!" -ForegroundColor Red
        Write-Host ""
        Write-Host "   📥 Download Options:" -ForegroundColor Yellow
        Write-Host "   1. Contact repository owner for download link"
        Write-Host "   2. Check GitHub Releases page"
        Write-Host "   3. Use cloud storage link (if provided)"
        Write-Host "   4. Train your own model (see apps/training/README.md)"
    }
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "📚 Additional Information:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Component Status Without Downloads:" -ForegroundColor Yellow
Write-Host "    • Component 1 (Disease Detection): ❌ Won't work (model.pt required)"
Write-Host "    • Component 2 (IoT Monitoring): ✅ Works (model included in git)"
Write-Host "    • Component 3 (Treatment): ✅ Works (no model needed)"
Write-Host "    • Component 4 (Harvest): ✅ Measurement-based works"
Write-Host "    • Component 4 (ML Demo): ⚠️  Optional (harvest_model.h5 needed)"
Write-Host ""
Write-Host "  Alternative Solutions:" -ForegroundColor Yellow
Write-Host "    • Use Git LFS (Large File Storage) if available"
Write-Host "    • Host models on cloud storage (Google Drive, Dropbox, etc.)"
Write-Host "    • Use model hosting services (Hugging Face, AWS S3, etc.)"
Write-Host "    • Share via WeTransfer or similar services"
Write-Host ""
Write-Host "  Training Your Own Models:" -ForegroundColor Yellow
Write-Host "    • See: apps/training/README.md"
Write-Host "    • Requires: Dataset, GPU (recommended), PyTorch"
Write-Host "    • Training time: ~2-4 hours (depending on hardware)"
Write-Host ""

Write-Host "✅ Next Steps:" -ForegroundColor Green
Write-Host "  1. Download required model files"
Write-Host "  2. Place them in the correct directories"
Write-Host "  3. Verify file sizes match expected values"
Write-Host "  4. Run backend server to test: python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
Write-Host "  5. Check http://localhost:8000/docs for API status"
Write-Host ""

Read-Host "Press Enter to exit"
