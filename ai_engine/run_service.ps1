Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   Starting DoXeAI YOLOv8 Plate Recognition Service   " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Set-Location -Path $PSScriptRoot
python main.py
