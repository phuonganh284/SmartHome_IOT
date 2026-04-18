import sys
import os
import random
import time
import serial.tools.list_ports
import json
import requests
from Adafruit_IO import MQTTClient
from dotenv import load_dotenv

# load environment from gateway/.env
load_dotenv()

# --- config ---
AIO_USERNAME = os.getenv("AIO_USERNAME")
AIO_KEY = os.getenv("AIO_KEY")

# backend webhook url (e.g. http://host:3000)
BACKEND_URL = os.getenv("BACKEND_URL")
if not BACKEND_URL:
    BACKEND_URL = "http://localhost:3000"
    print("BACKEND_URL not set — defaulting to http://localhost:3000")


if not AIO_USERNAME or not AIO_KEY:
    print("Adafruit IO credentials missing. Set AIO_USERNAME and AIO_KEY in gateway/.env")
    sys.exit(1)

# --- feeds ---
SENSOR_FEEDS = ["dadn-sensor"]

CONTROL_FEEDS = [
    "dadn-fan-1-power", "dadn-fan-1-mode", "dadn-fan-1-speed",
    "dadn-fan-2-power", "dadn-fan-2-mode", "dadn-fan-2-speed",
    "dadn-led-power", "dadn-led-intensity", "dadn-led-color"
]

# --- callbacks ---
def connected(client):
    print("Connected to Adafruit IO!")
    for feed in CONTROL_FEEDS:
        client.subscribe(feed)
    for feed in SENSOR_FEEDS:
        client.subscribe(feed)    

def message(client, feed_id, payload):
    print(f"Received: [{feed_id}] -> {payload}")

    # 1. SENSOR DATA 
    if feed_id in SENSOR_FEEDS:
        if not BACKEND_URL:
            return
        try:
            parsed = None

            # JSON format
            try:
                parsed = json.loads(payload)
                print("[SENSOR DEBUG] parsed as JSON")
            except Exception as e:
                print(f"[SENSOR DEBUG] json.loads failed: {e}")
                parts = [p for p in payload.split(",") if p]
                d = {}
                for p in parts:
                    if ":" in p:
                        k, v = p.split(":", 1)
                        try:
                            d[k.strip()] = float(v.strip())
                        except:
                            d[k.strip()] = v.strip()
                if d:
                    parsed = d

            # String format ("40,34,45")
            if parsed is None:
                parts = [p.strip() for p in payload.split(",") if p.strip()]
                print(f"[SENSOR DEBUG] CSV parts: {parts}")
                if parts:
                    is_number = True
                    for p in parts:
                        try:
                            float(p)
                        except Exception:
                            is_number = False
                            break
                    print(f"[SENSOR DEBUG] is_number={is_number}")
                    if is_number:
                        parsed = ",".join(parts)
                        print(f"[SENSOR DEBUG] treated as CSV string -> {parsed}")

            if parsed:
                url = BACKEND_URL.rstrip("/") + "/api/iot/sensor_readings"
                headers = {}
                print(f"[SENSOR] forwarding payload: {parsed} -> {url}")

                resp = requests.post(
                    url,
                    json={"feed": feed_id, "readings": parsed},
                    headers=headers,
                    timeout=5
                )

                if resp.ok:
                    print(f"[SENSOR] forwarded → {url}")
                else:
                    print(f"[SENSOR ERROR] {resp.status_code}: {resp.text}")

        except Exception as e:
            print("Sensor forward error:", e)

        return   

    # 2. CONTROL FLOW
    print(f"Command Received: [{feed_id}] -> {payload}")

    if isMicrobitConnected:
        ser.write((str(payload) + "#").encode())
    else:
        simulateDevice(feed_id, payload)

    # notify backend (control only)
    if BACKEND_URL:
        try:
            url = BACKEND_URL.rstrip("/") + "/api/iot/feeds"
            resp = requests.post(
                url,
                json={"feed": feed_id, "payload": payload},
                timeout=5
            )

            if resp.ok:
                print(f"[CONTROL] notified backend → {url}")
            else:
                print(f"[CONTROL ERROR] {resp.status_code}: {resp.text}")

        except Exception as e:
            print("Backend notify error:", e)

def simulateDevice(feed_id, payload):
    if "fan" in feed_id:
        if payload == "0":
            print(f"[SIM FAN] {feed_id} OFF")
        else:
            print(f"[SIM FAN] {feed_id} Speed = {payload}")

    elif "led" in feed_id:
        print(f"[SIM LIGHT] {feed_id} Value = {payload}")

    else:
        print(f"[SIM UNKNOWN] {feed_id}: {payload}")

def subscribe(client, userdata, mid, granted_qos):
    print(f"Subscribed successfully (ID: {mid})")

def disconnected(client):
    print("Disconnecting...")
    sys.exit(1)



client = MQTTClient(AIO_USERNAME , AIO_KEY)
client.on_connect = connected
client.on_disconnect = disconnected
client.on_message = message
client.on_subscribe = subscribe
client.connect()
client.loop_background()


def getPort():
    # allow overriding the serial port via MICROBIT_PORT env var
    env_port = os.getenv("MICROBIT_PORT")
    if env_port:
        return env_port

    ports = serial.tools.list_ports.comports()
    N = len(ports)
    commPort = "None"
    for i in range(0, N):
        port = ports[i]
        strPort = str(port)
        if "USB Serial Device" in strPort:
            splitPort = strPort.split(" ")
            commPort = (splitPort[0])
    return commPort

isMicrobitConnected = False

port = getPort()
if port != "None":
    ser = serial.Serial(port=port, baudrate=115200)
    isMicrobitConnected = True


def processData(data):
    data = data.replace("!", "")
    data = data.replace("#", "")
    splitData = data.split(":")
    print(splitData)
    if splitData[1] == "TEMP":
        client.publish("dadn-temp", splitData[2])

mess = ""
def readSerial():
    bytesToRead = ser.inWaiting()
    if (bytesToRead > 0):
        global mess
        mess = mess + ser.read(bytesToRead).decode("UTF-8")
        while ("#" in mess) and ("!" in mess):
            start = mess.find("!")
            end = mess.find("#")
            processData(mess[start:end + 1])
            if (end == len(mess)):
                mess = ""
            else:
                mess = mess[end+1:]

while True:
    if isMicrobitConnected:
        readSerial()

    time.sleep(1)