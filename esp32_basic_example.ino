#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// IoT Cloud Platform settings
const char* serverURL = "http://YOUR_SERVER_IP:3000/api/data/update";
const char* apiKey = "e6c4f8242dc83e58e67fadd55c07e167"; // Replace with your actual API key

// Sensor pins (example)
#define TEMP_SENSOR_PIN A0
#define HUMIDITY_SENSOR_PIN A1

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
    // Read sensor values (replace with your actual sensor code)
    float temperature = readTemperature();
    float humidity = readHumidity();
    float pressure = readPressure();
    
    // Send data to IoT Cloud Platform
    sendSensorData(temperature, humidity, pressure);
    
    Serial.println("Data sent successfully!");
  } else {
    Serial.println("WiFi disconnected, attempting to reconnect...");
    WiFi.begin(ssid, password);
  }
  
  // Wait 10 seconds before next reading
  delay(10000);
}

// Function to read temperature (replace with your sensor code)
float readTemperature() {
  // Example: DHT22, DS18B20, or analog sensor
  // For demo purposes, generating random values
  return 20.0 + random(0, 150) / 10.0; // 20.0 to 35.0°C
}

// Function to read humidity (replace with your sensor code)
float readHumidity() {
  // Example: DHT22 or other humidity sensor
  return 40.0 + random(0, 400) / 10.0; // 40.0 to 80.0%
}

// Function to read pressure (replace with your sensor code)
float readPressure() {
  // Example: BMP280, BME280
  return 1000.0 + random(0, 200) / 10.0; // 1000.0 to 1020.0 hPa
}

// Function to send sensor data to IoT Cloud Platform
void sendSensorData(float temp, float hum, float press) {
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["api_key"] = apiKey;
  doc["field1"] = temp;
  doc["field2"] = hum;
  doc["field3"] = press;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Sending data: " + jsonString);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response: " + String(httpResponseCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("Error sending data: " + String(httpResponseCode));
  }
  
  http.end();
}

// Alternative: Send data using GET method (simpler for basic sensors)
void sendSensorDataGET(float temp, float hum, float press) {
  HTTPClient http;
  
  // Build URL with parameters
  String url = String(serverURL) + "?api_key=" + apiKey;
  url += "&field1=" + String(temp);
  url += "&field2=" + String(hum);
  url += "&field3=" + String(press);
  
  Serial.println("Sending GET request: " + url);
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response: " + String(httpResponseCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("Error sending data: " + String(httpResponseCode));
  }
  
  http.end();
}
