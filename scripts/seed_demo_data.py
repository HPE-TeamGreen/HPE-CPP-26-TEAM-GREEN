import requests
import random
import time
import sys
import subprocess
import re
import os
import argparse
from datetime import datetime, timezone

# Configuration
NUM_SHIPMENTS_TO_CREATE = 15

# Logistics Data Pool
LOCATIONS = [
    "Mangaluru Warehouse", "Bengaluru Hub", "Mysuru Distribution",
    "Udupi Port", "Hubballi Storage", "Chennai Central", "Mumbai Docks"
]

# Temperature Profiles: (Min, Max, [matching product names])
TEMP_PROFILES = [
    (2.0, 8.0,    ["Vaccines", "Insulin", "Biologics", "Reagents"]),
    (-20.0, -10.0, ["Plasma", "Blood Products", "Tissue Samples"]),
    (15.0, 25.0,   ["Eye Drops", "Antibiotics", "IV Fluids"]),
]

# Tunnel process tracker
tunnel_process = None

def cleanup_tunnel():
    global tunnel_process
    if tunnel_process:
        print("\n[STOP] Stopping Minikube service tunnel...")
        tunnel_process.terminate()
        try:
            tunnel_process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            tunnel_process.kill()
        tunnel_process = None

def is_url_reachable(url):
    try:
        # Check endpoint reachability (expecting any HTTP response, even error codes)
        requests.get(url, timeout=1.5)
        return True
    except requests.exceptions.RequestException:
        return False

def get_minikube_url(custom_url=None):
    global tunnel_process
    
    # 1. Direct custom URL from command line argument
    if custom_url:
        print(f"[INFO] Using custom API URL provided via command line: {custom_url}")
        return custom_url
        
    # 2. API URL from environment variable
    env_url = os.environ.get("API_URL")
    if env_url:
        print(f"[INFO] Using API URL from environment variable: {env_url}")
        return env_url

    # 3. Check if standard localhost port is already accessible
    local_url = "http://127.0.0.1:30080/api"
    print(f"[CHECK] Checking if local API is accessible at {local_url}...")
    if is_url_reachable(f"{local_url}/shipments"):
        print(f"[OK] Found active local API at {local_url}")
        return local_url

    localhost_url = "http://localhost:30080/api"
    if is_url_reachable(f"{localhost_url}/shipments"):
        print(f"[OK] Found active local API at {localhost_url}")
        return localhost_url

    # 4. Check Minikube direct IP (works on VM-based drivers like VirtualBox or Hyper-V)
    try:
        ip = subprocess.check_output(["minikube", "ip"], text=True).strip()
        minikube_url = f"http://{ip}:30080/api"
        print(f"[CHECK] Checking if Minikube direct IP API is accessible at {minikube_url}...")
        if is_url_reachable(f"{minikube_url}/shipments"):
            print(f"[OK] Found active direct Minikube API at {minikube_url}")
            return minikube_url
    except Exception:
        pass

    # 5. Automatically spawn a Minikube service tunnel (handles Docker driver on Windows/macOS)
    print("[WARN] Direct connection to Minikube IP/NodePort failed. Attempting to start Minikube service tunnel...")
    try:
        cmd = ["minikube", "service", "frontend", "-n", "apps", "--url"]
        tunnel_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # Read stdout to extract the forwarded address
        url_pattern = re.compile(r"http://[a-zA-Z0-9.-]+:\d+")
        start_time = time.time()
        detected_url = None
        
        while time.time() - start_time < 15:
            if tunnel_process.poll() is not None:
                break
            line = tunnel_process.stdout.readline()
            if not line:
                time.sleep(0.1)
                continue
            match = url_pattern.search(line)
            if match:
                detected_url = match.group(0)
                break
                
        if detected_url:
            target_url = f"{detected_url}/api"
            print(f"[START] Started Minikube tunnel! Service forwarded to: {detected_url}")
            print(f"[URL] Target API URL: {target_url}")
            time.sleep(1.5)  # Wait for tunnel initialization
            return target_url
        else:
            cleanup_tunnel()
            print("[ERROR] Minikube service tunnel did not output a valid URL in time.")
    except Exception as e:
        cleanup_tunnel()
        print(f"[ERROR] Error starting Minikube service tunnel: {e}")

    print("\n[FAIL] Could not resolve a working API URL.")
    print("Guidance:")
    print("  1. Ensure Minikube is running: minikube start")
    print("  2. Run the deployment script:  .\\deploy.ps1")
    print("  3. Manually specify the URL:   python .\\scripts\\seed_demo_data.py --url <frontend-service-url>/api")
    sys.exit(1)

def generate_bulk_shipments(api_url):
    print(f"[START] Targeting API at: {api_url}")
    print(f"[START] Starting automated generation of {NUM_SHIPMENTS_TO_CREATE} shipments...")
    
    for i in range(1, NUM_SHIPMENTS_TO_CREATE + 1):
        sensor_name = f"SEN_{str(i).zfill(3)}"  # e.g., SEN_001, SEN_015
        
        origin = random.choice(LOCATIONS)
        destination = random.choice([loc for loc in LOCATIONS if loc != origin])
        profile = random.choice(TEMP_PROFILES)
        min_temp, max_temp = profile[0], profile[1]
        product = random.choice(profile[2])

        # --- 1. Create Shipment ---
        shipment_payload = {
            "origin": origin,
            "destination": destination,
            "product": product,
            "min_temp_limit": min_temp,
            "max_temp_limit": max_temp
        }
        res_shipment = requests.post(f"{api_url}/shipments", json=shipment_payload)
        
        if res_shipment.status_code != 201:
            print(f"[FAIL] Failed to create shipment {i}: {res_shipment.text}")
            continue
            
        shipment_id = res_shipment.json()["shipment_id"]

        # --- 2. Register Sensor ---
        sensor_payload = {
            "sensor_id": sensor_name,
            "calibration_date": datetime.now(timezone.utc).isoformat()
        }
        res_sensor = requests.post(f"{api_url}/shipments/{shipment_id}/sensors", json=sensor_payload)
        
        if res_sensor.status_code != 201:
            print(f"[FAIL] Failed to register sensor {sensor_name}: {res_sensor.text}")
            continue

        # --- 3. Dispatch (Set to IN_TRANSIT) ---
        status_payload = {
            "new_status": "IN_TRANSIT"
        }
        res_status = requests.patch(f"{api_url}/shipments/{shipment_id}/status", json=status_payload)
        
        if res_status.status_code == 200:
            print(f"[OK] Dispatched {sensor_name}: {origin} -> {destination} ({min_temp}C to {max_temp}C) [ID: {shipment_id}]")
        else:
            print(f"[FAIL] Failed to dispatch shipment {shipment_id}: {res_status.text}")
        
        # Tiny sleep so we don't overwhelm the API
        time.sleep(0.1)

    print("\n[SUCCESS] Bulk generation complete! All shipments are IN_TRANSIT and visible on your dashboard.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo shipments into TempSafe.")
    parser.add_argument(
        "--url", "-u",
        help="Direct URL to the backend API (e.g. http://localhost:8000/api)"
    )
    args = parser.parse_args()

    api_url = None
    try:
        api_url = get_minikube_url(args.url)
        generate_bulk_shipments(api_url)
    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] Could not connect to the API at {api_url or 'unknown'}.")
        print("Please check if the frontend/ingress service is running and accessible.")
    finally:
        cleanup_tunnel()
