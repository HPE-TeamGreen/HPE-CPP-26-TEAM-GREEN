#!/bin/bash
# =============================================================
# TempSafe — Full-Stack Minikube Deployment Script
# =============================================================
# This script builds all Docker images inside the Minikube Docker
# daemon and deploys the complete stack in the correct order.
#
# Prerequisites:
#   - Minikube is running:   minikube start
#   - kubectl is configured: kubectl config use-context minikube
# =============================================================

set -e

echo "=============================================="
echo "  TempSafe — Full-Stack Minikube Deployment"
echo "=============================================="

# ----------------------------------------------------------
# Step 0: Point Docker CLI to Minikube's Docker daemon
# ----------------------------------------------------------
echo ""
echo "[0/6] Configuring Docker to use Minikube's daemon..."
eval $(minikube docker-env)

# ----------------------------------------------------------
# Step 1: Build all Docker images
# ----------------------------------------------------------
echo ""
echo "[1/6] Building Docker images..."

echo "  → Building tempsafe-shipment..."
docker build -t tempsafe-shipment:latest ./backend/shipment/

echo "  → Building tempsafe-telemetry..."
docker build -t tempsafe-telemetry:latest ./backend/telemetry/

echo "  → Building tempsafe-simulator..."
docker build -t tempsafe-simulator:latest ./backend/simulator/

echo "  → Building tempsafe-reporting..."
docker build -t tempsafe-reporting:latest ./backend/reporting/

echo "  → Building tempsafe-frontend..."
docker build -t tempsafe-frontend:latest ./frontend/

echo "  ✅ All images built successfully."

# ----------------------------------------------------------
# Step 2: Create Namespaces
# ----------------------------------------------------------
echo ""
echo "[2/6] Creating namespaces..."
kubectl apply -f k8s/namespaces/namespaces.yaml
echo "  ✅ Namespaces ready."

# ----------------------------------------------------------
# Step 3: Deploy Infrastructure (Postgres + Kafka)
# ----------------------------------------------------------
echo ""
echo "[3/6] Deploying infrastructure (Postgres + Kafka)..."
kubectl apply -f k8s/infra/postgres.yaml
kubectl apply -f k8s/infra/kafka.yaml

echo "  Waiting for Postgres to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/postgres -n data 2>/dev/null || \
  echo "  ⏳ Postgres still starting (will continue — services will retry)"

echo "  Waiting for Kafka to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/kafka -n data 2>/dev/null || \
  echo "  ⏳ Kafka still starting (will continue — services will retry)"

echo "  ✅ Infrastructure deployed."

# ----------------------------------------------------------
# Step 4: Deploy Backend Services
# ----------------------------------------------------------
echo ""
echo "[4/6] Deploying backend services..."
kubectl apply -f k8s/backend/shipment.yaml
kubectl apply -f k8s/backend/telemetry.yaml
kubectl apply -f k8s/backend/reporting.yaml
kubectl apply -f k8s/backend/simulator.yaml
echo "  ✅ Backend services deployed."

# ----------------------------------------------------------
# Step 5: Deploy Frontend & Monitoring
# ----------------------------------------------------------
echo ""
echo "[5/6] Deploying frontend and monitoring (Prometheus + Grafana)..."
kubectl apply -f k8s/frontend/frontend.yaml
kubectl apply -f k8s/infra/prometheus.yaml
kubectl apply -f k8s/infra/grafana.yaml
echo "  ✅ Frontend and monitoring deployed."

# ----------------------------------------------------------
# Step 6: Summary
# ----------------------------------------------------------
echo ""
echo "[6/6] Deployment complete! Waiting for pods..."
echo ""
sleep 5

echo "--- Pods in 'data' namespace ---"
kubectl get pods -n data
echo ""
echo "--- Pods in 'apps' namespace ---"
kubectl get pods -n apps
echo ""
echo "--- Pods in 'monitoring' namespace ---"
kubectl get pods -n monitoring
echo ""
echo "--- Services in 'apps' namespace ---"
kubectl get svc -n apps
echo ""
echo "--- Services in 'monitoring' namespace ---"
kubectl get svc -n monitoring
echo ""

echo "=============================================="
echo "  Access the application:"
echo "    minikube service frontend -n apps"
echo "  Or directly at:"
echo "    http://$(minikube ip):30080"
echo ""
echo "  Access Monitoring Dashboards:"
echo "    Prometheus: http://$(minikube ip):30090"
echo "    Grafana:    http://$(minikube ip):30091 (Credentials: admin/admin)"
echo "=============================================="
