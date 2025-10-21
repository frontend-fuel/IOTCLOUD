#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// IoT Cloud Platform settings
const char* serverURL = "http://YOUR_SERVER_IP:3000/api/data/update";

// API Keys for your two channels
const char* channel1_apiKey = "bcc3aba81a72431bd87c3e1fb34a39b3";
const char* channel2_apiKey = "68f72f5ffb072e0c381b3a87";

// Sensor simulation variables
float temperature = 25.0;
float humidity = 60.0;
float pressure = 1013.2;
float light = 450.0;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
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
    
    // Simulate sensor readings
    temperature = 20.0 + random(0, 100) / 10.0;  // 20.0 to 30.0
    humidity = 40.0 + random(0, 400) / 10.0;     // 40.0 to 80.0
    pressure = 1000.0 + random(0, 300) / 10.0;   // 1000.0 to 1030.0
    light = 300.0 + random(0, 4000) / 10.0;      // 300.0 to 700.0
    
    // Send data to Channel 1 (Temperature & Humidity)
    sendDataToChannel1(temperature, humidity);
    
    delay(2000); // Wait 2 seconds between channels
    
    // Send data to Channel 2 (Pressure & Light)
    sendDataToChannel2(pressure, light);
    
    Serial.println("Data sent to both channels!");
    Serial.println("Waiting 30 seconds...");
    
  } else {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.begin(ssid, password);
  }
  
  delay(30000); // Send data every 30 seconds
}

void sendDataToChannel1(float temp, float hum) {
  HTTPClient http;
  
  // Build URL for Channel 1
  String url = String(serverURL) + "?api_key=" + channel1_apiKey + 
               "&field1=" + String(temp) + 
               "&field2=" + String(hum);
  
  Serial.println("Channel 1 URL: " + url);
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Channel 1 Response: " + response);
  } else {
    Serial.println("Channel 1 Error: " + String(httpResponseCode));
  }
  
  http.end();
}

void sendDataToChannel2(float press, float lux) {
  HTTPClient http;
  
  // Build URL for Channel 2
  String url = String(serverURL) + "?api_key=" + channel2_apiKey + 
               "&field1=" + String(press) + 
               "&field2=" + String(lux);
  
  Serial.println("Channel 2 URL: " + url);
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Channel 2 Response: " + response);
  } else {
    Serial.println("Channel 2 Error: " + String(httpResponseCode));
  }
  
  http.end();
}
