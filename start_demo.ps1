# Auto-generated script to start all MediChain background services
Write-Host "Starting MediChain Local Environment..." -ForegroundColor Green

# 1. Start Hardhat Node
Start-Process powershell -ArgumentList "-NoExit -Command `"cd d:\Medichain; npx hardhat node`""
Start-Sleep -Seconds 4

# 2. Deploy Contracts
Write-Host "Deploying Contracts..." -ForegroundColor Yellow
npx hardhat run scripts/deploy.js --network localhost

# 3. Clean DB and start backend
Write-Host "Starting Python API and Indexer..." -ForegroundColor Yellow
Remove-Item -Force backend\medichain.db -ErrorAction SilentlyContinue

Start-Process powershell -ArgumentList "-NoExit -Command `"cd d:\Medichain\backend; .\venv\Scripts\activate; uvicorn main:app --host 127.0.0.1 --port 8000 --reload`""
Start-Process powershell -ArgumentList "-NoExit -Command `"cd d:\Medichain\backend; .\venv\Scripts\activate; python indexer.py`""

# 4. Start Frontend
Write-Host "Starting Next.js Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd d:\Medichain\frontend; npm run dev`""

Write-Host "All processes started! Check the newly opened terminal windows." -ForegroundColor Green
