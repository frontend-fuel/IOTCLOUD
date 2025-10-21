#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials - UPDATE THESE
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// IoT Cloud Platform settings - YOUR ACTUAL RENDER URL
const char* serverURL = "https://iotcloud.onrender.com/api/data/update";

// API Key for channel ID: 68f77f1b9db5fe2f51709f41
// Get this from your channel dashboard
const char* apiKey = "YOUR_WRITE_API_KEY_HERE";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🚀 IoT Cloud Platform - Arduino Test");
  Serial.println("=====================================");
  
  // Initialize WiFi
  WiFi.begin(ssid, password);
  Serial.print("📡 Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("✅ WiFi connected!");
  Serial.print("🌐 IP address: ");
  Serial.println(WiFi.localIP());
  Serial.println("=====================================");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // Generate test sensor data
    float temperature = 20.0 + random(0, 150) / 10.0; // 20-35°C
    float humidity = 40.0 + random(0, 400) / 10.0;    // 40-80%
    float pressure = 1000.0 + random(0, 200) / 10.0;  // 1000-1020 hPa
    
    Serial.println("📊 Sending sensor data...");
    Serial.println("Temperature: " + String(temperature, 2) + "°C");
    Serial.println("Humidity: " + String(humidity, 2) + "%");
    Serial.println("Pressure: " + String(pressure, 2) + " hPa");
    
    // Send data using POST method
    sendDataToCloud(temperature, humidity, pressure);
    
  } else {
    Serial.println("❌ WiFi disconnected, reconnecting...");
    WiFi.begin(ssid, password);
  }
  
  Serial.println("⏳ Waiting 20 seconds...");
  Serial.println("=====================================");
  delay(20000); // Send every 20 seconds
}

void sendDataToCloud(float temp, float hum, float press) {
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<300> doc;
  doc["api_key"] = apiKey;
  doc["field1"] = temp;
  doc["field2"] = hum;
  doc["field3"] = press;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("📤 Sending JSON: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ SUCCESS! HTTP Code: " + String(httpResponseCode));
    Serial.println("📥 Response: " + response);
    
    if (httpResponseCode == 200) {
      Serial.println("🎉 Data successfully sent to IoT Cloud!");
    }
  } else {
    Serial.println("❌ ERROR! HTTP Code: " + String(httpResponseCode));
    Serial.println("🔧 Check your WiFi, URL, and API key!");
    
    // Common error codes
    if (httpResponseCode == -1) {
      Serial.println("💡 Tip: Connection failed - check WiFi");
    } else if (httpResponseCode == 404) {
      Serial.println("💡 Tip: URL not found - check server URL");
    } else if (httpResponseCode == 401) {
      Serial.println("💡 Tip: Unauthorized - check API key");
    }
  }
  
  http.end();
}

// Alternative GET method (simpler but less reliable)
void sendDataGET(float temp, float hum, float press) {
  HTTPClient http;
  
  String url = String(serverURL) + "?api_key=" + apiKey;
  url += "&field1=" + String(temp, 2);
  url += "&field2=" + String(hum, 2);
  url += "&field3=" + String(press, 2);
  
  Serial.println("📤 GET URL: " + url);
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ GET Success: " + String(httpResponseCode));
    Serial.println("📥 Response: " + response);
  } else {
    Serial.println("❌ GET Error: " + String(httpResponseCode));
  }
  
  http.end();
}
