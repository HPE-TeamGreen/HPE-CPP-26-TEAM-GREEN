# =============================================================
# TempSafe - Full-Stack Minikube Deployment Script (PowerShell)
# =============================================================
# This script builds all Docker images inside the Minikube Docker
# daemon and deploys the complete stack in the correct order.
#
# Prerequisites:
#   - Minikube is running:   minikube start
#   - kubectl is configured: kubectl config use-context minikube
# =============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  TempSafe - Full-Stack Minikube Deployment"   -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ----------------------------------------------------------
# Step 0: Point Docker CLI to Minikube Docker daemon
# ----------------------------------------------------------
Write-Host ""
Write-Host "[0/6] Configuring Docker to use Minikube daemon..." -ForegroundColor Yellow
& minikube docker-env --shell powershell | Invoke-Expression

# ----------------------------------------------------------
# Step 1: Build all Docker images
# ----------------------------------------------------------
Write-Host ""
Write-Host "[1/6] Building Docker images..." -ForegroundColor Yellow

Write-Host "  -> Building tempsafe-shipment..."
docker build -t tempsafe-shipment:latest ./backend/shipment/

Write-Host "  -> Building tempsafe-telemetry..."
docker build -t tempsafe-telemetry:latest ./backend/telemetry/

Write-Host "  -> Building tempsafe-simulator..."
docker build -t tempsafe-simulator:latest ./backend/simulator/

Write-Host "  -> Building tempsafe-reporting..."
docker build --no-cache -t tempsafe-reporting:latest ./backend/reporting/

Write-Host "  -> Building tempsafe-frontend..."
docker build -t tempsafe-frontend:latest ./frontend/

Write-Host "  All images built successfully." -ForegroundColor Green

# ----------------------------------------------------------
# Step 2: Create Namespaces
# ----------------------------------------------------------
Write-Host ""
Write-Host "[2/6] Creating namespaces..." -ForegroundColor Yellow
kubectl apply -f k8s/namespaces/namespaces.yaml
Write-Host "  Namespaces ready." -ForegroundColor Green

# ----------------------------------------------------------
# Step 3: Deploy Infrastructure (Postgres + Kafka)
# ----------------------------------------------------------
Write-Host ""
Write-Host "[3/6] Deploying infrastructure (Postgres + Kafka)..." -ForegroundColor Yellow
kubectl apply -f k8s/infra/postgres.yaml
kubectl apply -f k8s/infra/kafka.yaml

Write-Host "  Waiting for Postgres to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/postgres -n data 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Postgres still starting (will continue - services will retry)" -ForegroundColor DarkYellow
}

Write-Host "  Waiting for Kafka to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/kafka -n data 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Kafka still starting (will continue - services will retry)" -ForegroundColor DarkYellow
}

Write-Host "  Infrastructure deployed." -ForegroundColor Green

# ----------------------------------------------------------
# Step 4: Deploy Backend Services
# ----------------------------------------------------------
Write-Host ""
Write-Host "[4/6] Deploying backend services..." -ForegroundColor Yellow
kubectl apply -f k8s/backend/shipment.yaml
kubectl apply -f k8s/backend/telemetry.yaml
kubectl apply -f k8s/backend/reporting.yaml
kubectl apply -f k8s/backend/simulator.yaml
Write-Host "  Backend services deployed." -ForegroundColor Green

# ----------------------------------------------------------
# Step 5: Deploy Frontend
# ----------------------------------------------------------
Write-Host ""
Write-Host "[5/6] Deploying frontend..." -ForegroundColor Yellow
kubectl apply -f k8s/frontend/frontend.yaml
Write-Host "  Frontend deployed." -ForegroundColor Green

# ----------------------------------------------------------
# Step 6: Summary
# ----------------------------------------------------------
Write-Host ""
Write-Host "[6/6] Deployment complete! Waiting for pods..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "--- Pods in data namespace ---" -ForegroundColor Cyan
kubectl get pods -n data

Write-Host ""
Write-Host "--- Pods in apps namespace ---" -ForegroundColor Cyan
kubectl get pods -n apps

Write-Host ""
Write-Host "--- Services in apps namespace ---" -ForegroundColor Cyan
kubectl get svc -n apps

$minikubeIp = minikube ip
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Access the application:"                      -ForegroundColor Cyan
Write-Host "    minikube service frontend -n apps"          -ForegroundColor White
Write-Host "  Or directly at:"                              -ForegroundColor Cyan
Write-Host "    http://${minikubeIp}:30080"                 -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan
