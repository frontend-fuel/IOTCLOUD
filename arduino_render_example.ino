#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// IoT Cloud Platform settings - UPDATE THIS WITH YOUR RENDER URL
const char* serverURL = "https://your-app-name.onrender.com/api/data/update";
const char* apiKey = "YOUR_CHANNEL_API_KEY"; // Get this from your channel dashboard

// Sensor simulation
void setup() {
  Serial.begin(115200);
  
  // Initialize WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // Generate test data
    float temperature = 20.0 + random(0, 150) / 10.0; // 20-35°C
    float humidity = 40.0 + random(0, 400) / 10.0;    // 40-80%
    float pressure = 1000.0 + random(0, 200) / 10.0;  // 1000-1020 hPa
    
    // Method 1: POST request (recommended)
    sendDataPOST(temperature, humidity, pressure);
    
    // Method 2: GET request (alternative)
    // sendDataGET(temperature, humidity, pressure);
    
  } else {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.begin(ssid, password);
  }
  
  delay(15000); // Send every 15 seconds
}

// POST method (recommended)
void sendDataPOST(float temp, float hum, float press) {
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
  
  Serial.println("Sending POST data: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Success! Response: " + String(httpResponseCode));
    Serial.println("Response body: " + response);
  } else {
    Serial.println("❌ Error: " + String(httpResponseCode));
    Serial.println("Check your URL and API key!");
  }
  
  http.end();
}

// GET method (alternative)
void sendDataGET(float temp, float hum, float press) {
  HTTPClient http;
  
  String url = String(serverURL) + "?api_key=" + apiKey;
  url += "&field1=" + String(temp, 2);
  url += "&field2=" + String(hum, 2);
  url += "&field3=" + String(press, 2);
  
  Serial.println("Sending GET request: " + url);
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Success! Response: " + String(httpResponseCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("❌ Error: " + String(httpResponseCode));
  }
  
  http.end();
}
