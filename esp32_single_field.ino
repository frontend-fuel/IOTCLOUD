#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Local server settings
const char* serverIP = "192.168.0.105"; // Your computer's local IP
const int serverPort = 3000;
const char* apiKey = "e6c4f8242dc83e58e67fadd55c07e167"; // Your channel's API key

// Sensor pin (example for analog sensor)
#define SENSOR_PIN A0

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
    // Read sensor value (replace with your actual sensor code)
    float sensorValue = readSensor();
    
    // Send data to local IoT server
    sendData(sensorValue);
    
    Serial.println("Data sent: " + String(sensorValue));
  } else {
    Serial.println("WiFi disconnected!");
  }
  
  // Wait 5 seconds before next reading
  delay(5000);
}

// Function to read sensor (customize for your sensor)
float readSensor() {
  // Example: Read analog sensor and convert to meaningful value
  int rawValue = analogRead(SENSOR_PIN);
  float voltage = rawValue * (3.3 / 4095.0); // ESP32 ADC conversion
  
  // Convert to temperature (example for LM35 sensor)
  float temperature = voltage * 100.0; // LM35: 10mV per degree
  
  return temperature;
  
  // Alternative: Generate random test data
  // return 20.0 + random(0, 150) / 10.0; // Random temperature 20-35°C
}

// Send single field data using simple GET request
void sendData(float value) {
  HTTPClient http;
  
  // Build simple URL for local server
  String url = "http://" + String(serverIP) + ":" + String(serverPort) + "/api/data/update";
  url += "?api_key=" + String(apiKey);
  url += "&field1=" + String(value);
  
  Serial.println("Sending to: " + url);
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✓ Success: " + String(httpResponseCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("✗ Error: " + String(httpResponseCode));
  }
  
  http.end();
}
