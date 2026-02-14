import httpx
import time
import sys

def wait_for_api():
    url = "http://backend:8787/health"
    print(f"Waiting for API at {url}...")

    timeout = 120
    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            resp = httpx.get(url)
            if resp.status_code == 200:
                print("API is up!")
                return
            else:
                print(f"API responded with status {resp.status_code}")
        except Exception as e:
            print(f"Connection failed: {e}")
        time.sleep(1)

    print("Timeout waiting for API")
    sys.exit(1)

if __name__ == "__main__":
    wait_for_api()
