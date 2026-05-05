#!/usr/bin/env python3
"""Read ESP32 sensor readings over USB serial and forward them to the FastAPI IoT endpoint.

Install dependency:
    pip install pyserial requests

Usage:
    python scripts/esp32_serial_bridge.py --port COM5 --baud 115200
"""

import argparse
import json
import time
from typing import Any, Dict

import requests
import serial


DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1/iot/readings"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ESP32 USB serial bridge")
    parser.add_argument("--port", required=True, help="Serial port, e.g. COM5")
    parser.add_argument("--baud", type=int, default=115200, help="Serial baud rate")
    parser.add_argument("--device-id", default="DEV001", help="Fallback device ID")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Backend IoT ingest URL")
    return parser.parse_args()


def normalize_payload(data: Dict[str, Any], fallback_device_id: str) -> Dict[str, Any] | None:
    try:
        return {
            "deviceId": str(data.get("deviceId", fallback_device_id)),
            "temperature": float(data["temperature"]),
            "humidity": float(data["humidity"]),
            "soilMoisture": float(data["soilMoisture"]),
            "soilRaw": int(data["soilRaw"]) if "soilRaw" in data and data["soilRaw"] is not None else None,
        }
    except (KeyError, TypeError, ValueError):
        return None


def main() -> int:
    args = parse_args()

    print(f"Opening serial port {args.port} at {args.baud} baud")
    print(f"Forwarding readings to {args.api_url}")

    with serial.Serial(args.port, args.baud, timeout=1) as ser:
        time.sleep(2)
        while True:
            raw_line = ser.readline().decode("utf-8", errors="ignore").strip()
            if not raw_line:
                continue

            if raw_line == "ESP32 sensor bridge ready":
                print(raw_line)
                continue

            try:
                payload = json.loads(raw_line)
            except json.JSONDecodeError:
                print(f"Skipping non-JSON line: {raw_line}")
                continue

            normalized = normalize_payload(payload, args.device_id)
            if normalized is None:
                print(f"Skipping invalid payload: {payload}")
                continue

            try:
                response = requests.post(args.api_url, json=normalized, timeout=10)
                response.raise_for_status()
                print(f"Sent {normalized} -> {response.status_code}")
            except requests.RequestException as exc:
                print(f"Failed to forward reading: {exc}")


if __name__ == "__main__":
    raise SystemExit(main())