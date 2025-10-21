# IoT Cloud Platform

A complete IoT data collection and visualization platform similar to ThingSpeak, built with Node.js, Express, MongoDB, and modern web technologies.

## Features

- **User Authentication**: Secure registration and login system
- **Channel Management**: Create and manage IoT data channels
- **Data Collection**: REST API for IoT devices to send data
- **Real-time Visualization**: Interactive charts using Chart.js
- **Responsive Design**: Modern UI that works on all devices
- **API Keys**: Secure API key system for device authentication

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js
- **Authentication**: Session-based with bcrypt password hashing

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iot-cloud-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/iot_platform
   JWT_SECRET=your_jwt_secret_key_here
   SESSION_SECRET=your_session_secret_here
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # On Windows (if installed as service)
   net start MongoDB
   
   # On macOS/Linux
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to `http://localhost:3000`

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Channel Management

- `GET /api/channels` - Get user's channels
- `POST /api/channels` - Create new channel
- `GET /api/channels/:id` - Get specific channel
- `PUT /api/channels/:id` - Update channel
- `DELETE /api/channels/:id` - Delete channel

### Data Collection

- `POST /api/data/update` - Add data to channel
- `GET /api/data/channels/:id` - Get channel data
- `GET /api/data/channels/:id/fields/:fieldNumber` - Get specific field data

## IoT Device Integration

To send data from your IoT device, use the following format:

```javascript
// Example: Send temperature and humidity data
const data = {
  api_key: "your_channel_api_key",
  field1: 25.6,  // Temperature
  field2: 60.2,  // Humidity
  field3: 1013.25 // Pressure (optional)
};

fetch('http://your-server.com/api/data/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### Arduino Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "your_wifi_ssid";
const char* password = "your_wifi_password";
const char* serverURL = "http://your-server.com/api/data/update";
const char* apiKey = "your_channel_api_key";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
}

void sendData(float temperature, float humidity) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");
    
    StaticJsonDocument<200> doc;
    doc["api_key"] = apiKey;
    doc["field1"] = temperature;
    doc["field2"] = humidity;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      Serial.println("Data sent successfully");
    } else {
      Serial.println("Error sending data");
    }
    
    http.end();
  }
}
```

## Project Structure

```
iot-cloud-platform/
├── models/
│   ├── User.js          # User model
│   ├── Channel.js       # Channel model
│   └── Data.js          # Data model
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── channels.js      # Channel management routes
│   └── data.js          # Data collection routes
├── public/
│   ├── index.html       # Login page
│   ├── signup.html      # Registration page
│   ├── dashboard.html   # Main dashboard
│   ├── styles.css       # CSS styles
│   ├── auth.js          # Authentication JavaScript
│   └── dashboard.js     # Dashboard JavaScript
├── server.js            # Main server file
├── package.json         # Dependencies
├── .env                 # Environment variables
└── README.md           # This file
```

## Features Overview

### User Management
- Secure user registration and authentication
- Session-based login system
- Password hashing with bcrypt

### Channel System
- Create multiple data channels
- Configure up to 8 data fields per channel
- Public/private channel settings
- Unique API keys for each channel

### Data Visualization
- Real-time charts using Chart.js
- Multiple field visualization
- Historical data viewing
- Responsive chart design

### API Integration
- RESTful API for IoT devices
- JSON-based data format
- Secure API key authentication
- Flexible field mapping

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team.
