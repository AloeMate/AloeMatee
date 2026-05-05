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
const int SOIL_MOISTURE_PIN = 34;

// Soil sensor calibration values.
// Adjust these after checking dry and wet raw readings on your board.
const int SOIL_DRY_RAW = 3200;
const int SOIL_WET_RAW = 1400;

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSendMs = 0;
const unsigned long SEND_INTERVAL_MS = 15000;

float readSoilMoisturePercent() {
  int raw = analogRead(SOIL_MOISTURE_PIN);
  raw = constrain(raw, SOIL_WET_RAW, SOIL_DRY_RAW);

  int mapped = map(raw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100);
  return constrain(mapped, 0, 100);
}

void emitReading(float temperature, float humidity, float soilMoisture) {
  Serial.print("{\"deviceId\":\"");
  Serial.print(DEVICE_ID);
  Serial.print("\",\"temperature\":");
  Serial.print(temperature, 2);
  Serial.print(",\"humidity\":");
  Serial.print(humidity, 2);
  Serial.print(",\"soilMoisture\":");
  Serial.print(soilMoisture, 2);
  Serial.println("}");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);
  dht.begin();
  Serial.println("ESP32 sensor bridge ready");
}

void loop() {
  if (millis() - lastSendMs < SEND_INTERVAL_MS) {
    delay(200);
    return;
  }

  lastSendMs = millis();

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  float soilMoisture = readSoilMoisturePercent();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT22 sensor");
    return;
  }

  Serial.println("Sensor readings:");
  Serial.print("Temperature: ");
  Serial.println(temperature);
  Serial.print("Humidity: ");
  Serial.println(humidity);
  Serial.print("Soil moisture: ");
  Serial.println(soilMoisture);

  emitReading(temperature, humidity, soilMoisture);
}
