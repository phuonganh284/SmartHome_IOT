import sys
import os
import random
import time
import serial.tools.list_ports
from Adafruit_IO import MQTTClient
from dotenv import load_dotenv

# load environment from gateway/.env
load_dotenv()

# --- config ---
AIO_USERNAME = os.getenv("AIO_USERNAME")
AIO_KEY = os.getenv("AIO_KEY")

if not AIO_USERNAME or not AIO_KEY:
    print("Adafruit IO credentials missing. Set AIO_USERNAME and AIO_KEY in gateway/.env")
    sys.exit(1)

# --- feeds ---
SENSOR_FEEDS = ["dadn-temp", "dadn-ir"]
CONTROL_FEEDS = ["dadn-fan-1","dadn-fan-2", "dadn-led"]

# --- callbacks ---
def connected(client):
    print("Connected to Adafruit IO!")
    for feed in CONTROL_FEEDS:
        client.subscribe(feed)

def message(client, feed_id, payload):
    print(f"Command Received: [{feed_id}] -> {payload}")

    if isMicrobitConnected:
        ser.write((str(payload) + "#").encode())
    else:
        simulateDevice(feed_id, payload)

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