#include <DHT.h>

// USB serial bridge mode:
// The ESP32 sends JSON lines over USB serial.
// A Python script on the PC forwards the data to the FastAPI backend running on localhost.
const char* DEVICE_ID = "DEV001";

// =========================
// Sensor pins
// =========================
const int DHT_PIN = 4;
const int DHT_TYPE = DHT22;
const int SOIL_MOISTURE_PIN = 1;

// Soil sensor calibration values (runtime adjustable).
// Initialize with measured defaults; use serial 'd' (dry) and 'w' (wet) to calibrate.
int soilDryRaw = 3200;
int soilWetRaw = 1400;
const int SOIL_SAMPLES = 8;

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSendMs = 0;
const unsigned long SEND_INTERVAL_MS = 5000; // shorter for testing
unsigned long lastHeartbeatMs = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 1000;

// On-board LED for visual heartbeat. Change if your board uses a different pin.
const int LED_PIN = 13;

void logLine(const String& msg) {
  Serial.println(msg);
  Serial0.println(msg);
}

// expose raw ADC for debugging
int lastSoilRaw = 0;

float readSoilMoisturePercent() {
  long sum = 0;
  for (int i = 0; i < SOIL_SAMPLES; ++i) {
    sum += analogRead(SOIL_MOISTURE_PIN);
    delay(5);
  }
  int raw = (int)(sum / SOIL_SAMPLES);
  lastSoilRaw = raw;
  raw = constrain(raw, soilWetRaw, soilDryRaw);

  int mapped = map(raw, soilDryRaw, soilWetRaw, 0, 100);
  return constrain(mapped, 0, 100);
}

void emitReading(float temperature, float humidity, float soilMoisture) {
  String payload = "{\"deviceId\":\"";
  payload += DEVICE_ID;
  payload += "\",\"temperature\":";
  payload += String(temperature, 2);
  payload += ",\"humidity\":";
  payload += String(humidity, 2);
  payload += ",\"soilMoisture\":";
  payload += String(soilMoisture, 2);
  payload += ",\"soilRaw\":";
  payload += String(lastSoilRaw);
  payload += "}";

  logLine(payload);
}

void setup() {
  Serial.begin(115200);
  Serial0.begin(115200);
  delay(200);

  // On ESP32-S3, wait briefly for USB CDC serial to attach.
  unsigned long waitStart = millis();
  while (!Serial && (millis() - waitStart) < 5000) {
    delay(10);
  }

  analogReadResolution(12);
  dht.begin();
  // Initialize LED pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Force an immediate sensor send on first loop
  lastSendMs = millis() - SEND_INTERVAL_MS;
  logLine("ESP32-S3 sensor bridge ready");
  logLine("If you can read this, app serial output is working");
}

void loop() {
  if (millis() - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = millis();
    logLine("[alive]");
    // Toggle LED for visual heartbeat
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }

  if (millis() - lastSendMs < SEND_INTERVAL_MS) {
    delay(200);
    return;
  }

  lastSendMs = millis();

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  float soilMoisture = readSoilMoisturePercent();

  if (isnan(humidity) || isnan(temperature)) {
    logLine("Failed to read from DHT22 sensor");
    return;
  }

  logLine("Sensor readings:");
  logLine(String("Temperature: ") + String(temperature, 2));
  logLine(String("Humidity: ") + String(humidity, 2));
  logLine(String("Soil moisture: ") + String(soilMoisture, 2));

  emitReading(temperature, humidity, soilMoisture);
}
