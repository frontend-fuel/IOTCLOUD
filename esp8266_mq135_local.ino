#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// WiFi credentials
const char* ssid = "SRI SAI BOYS HOSTEL 1";
const char* password = "sai@949471";

// IoT Cloud Platform settings - LOCAL DEVELOPMENT
String writeAPIKey = "506f7f8e9cfd624f4657d40dd8b3cc89";

// LOCAL URLs - Your actual IP address
String serverName = "http://192.168.0.106:3000/api/data/update"; // Your actual local IP

// MQ135 Air Quality Sensor settings
#define MQ135_PIN A0
#define RLOAD 10.0
#define RZERO 76.63
#define PARA 116.6020682
#define PARB -2.769034857

WiFiClient client;

float MQResistanceCalculation(int raw_adc) {
  if (raw_adc == 0) return 0;
  return ((1023.0 / raw_adc) - 1.0) * RLOAD;
}

float MQ135GetPPM(int raw_adc) {
  float resistance = MQResistanceCalculation(raw_adc);
  float ratio = resistance / RZERO;
  float ppm = PARA * pow(ratio, PARB);
  return ppm;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🌬️ MQ135 Air Quality Monitor - LOCAL DEV");
  Serial.println("=========================================");
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("📡 Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("✅ WiFi Connected!");
  Serial.print("🌐 IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("🖥️ Server: " + serverName);
  Serial.println("=========================================");
}

void loop() {
  // Read MQ135 sensor
  int rawValue = analogRead(MQ135_PIN);
  float ppm = MQ135GetPPM(rawValue);
  
  Serial.println("📊 Sensor Reading:");
  Serial.println("Raw ADC: " + String(rawValue));
  Serial.println("Air Quality: " + String(ppm, 2) + " PPM");
  
  // Send data to local IoT Cloud Platform
  if (WiFi.status() == WL_CONNECTED) {
    sendDataToCloud(ppm, rawValue);
  } else {
    Serial.println("❌ WiFi disconnected!");
    WiFi.begin(ssid, password);
  }
  
  Serial.println("⏳ Waiting 10 seconds...");
  Serial.println("=========================================");
  delay(10000); // Send every 10 seconds for local testing
}

void sendDataToCloud(float ppm, int rawValue) {
  HTTPClient http;
  
  // POST request
  http.begin(client, serverName);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  String jsonData = "{";
  jsonData += "\"api_key\":\"" + writeAPIKey + "\",";
  jsonData += "\"field1\":" + String(ppm, 2) + ",";
  jsonData += "\"field2\":" + String(rawValue);
  jsonData += "}";
  
  Serial.println("📤 Sending to LOCAL server: " + jsonData);
  
  int httpCode = http.POST(jsonData);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("✅ LOCAL Success! Code: " + String(httpCode));
    Serial.println("📥 Response: " + response);
  } else {
    Serial.println("❌ LOCAL Error: " + String(httpCode));
    Serial.println("Error: " + http.errorToString(httpCode));
    Serial.println("💡 Make sure your local server is running on port 3000");
  }
  
  http.end();
}
