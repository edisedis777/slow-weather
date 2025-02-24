# 🌤️ Slow Weather
## Slow Weather Landscape Concept

<img width="399" alt="Screenshot 2025-02-21 at 21 59 56" src="https://github.com/user-attachments/assets/822928d6-1ffb-4a96-a0d7-7b2a999006e8" />


### 🎉 Live Demo:
[Click here to Visit](https://edisedis777.github.io/slow-weather/)

**Slow Weather** is an interactive web application that visualizes weather data as a dynamic landscape. Built with HTML, CSS, and JavaScript, it fetches real-time weather information from the [Open-Meteo API](https://open-meteo.com/) and transforms it into a scenic display featuring a terrain shaped by hourly temperatures, a swaying leaf indicating wind speed, and atmospheric effects like rain, snow, and clouds.

### ☁️ Features

- **Dynamic Terrain**: The landscape’s height varies with hourly temperature data over a 24-hour period.
- **Weather Effects**: 
  - Raindrops or snowflakes fall based on precipitation levels and temperature (rain if > 0°C, snow if < 0°C).
  - Clouds drift across the sky proportional to cloud cover.
  - Day/night sky transitions with a glowing sun or moon.
- **Wind Visualization**: A single leaf sways on the terrain, with animation speed reflecting wind speed (calmer at 4s, faster at 1s for 20+ m/s).
- **Time Axis**: Integrated at the terrain’s base, showing 6-hour intervals (00:00, 06:00, 12:00, 18:00, 24:00) with rounded styling.
- **Temperature Toggle**: Switch between Celsius and Fahrenheit with a button anchored to the terrain.
- **Responsive Design**: Rounded corners and a clean layout adapt to various screen sizes.

### 💽 Installation:
**Clone the Repository**:
   bash
   git clone
   cd weather-landscape
### Open the Project:
No dependencies required! Simply open index.html in a modern web browser (e.g., Chrome, Firefox).
Alternatively, serve it locally using a tool like Live Server in VS Code:
bash
Wrap
Copy
npx live-server

### ⌨️ Usage
Enter a City:
Type a city name (e.g., "London", "New York") into the input field and press Enter or click "Show Weather".

### 🗺️ Explore the Landscape:
Observe the terrain shaping based on the city’s hourly temperature forecast.
Watch the leaf sway with wind speed, and note precipitation effects (rain/snow).
Toggle between °C and °F using the button at the terrain’s base.

### 🦜 Interact:
The sun/moon adjusts with day/night status, and clouds reflect current cloud cover.
The time axis aligns with the terrain’s 24-hour temperature profile.

### ⚙️ How It Works
Data Source: Uses Open-Meteo’s free weather API for current and hourly forecast data **(no API key required).**

Tech Stack:
#### HTML: Structure for the landscape and UI elements.
#### CSS: Styling with animations (swaying leaf, drifting clouds, falling precipitation).
#### JavaScript: Fetches weather data, updates the SVG terrain, and manages dynamic effects.

### 🥡 Key Components:
SVG terrain with integrated time axis.
Leaf animation tied to wind speed.
Temperature-driven precipitation and color changes (snowy terrain below 0°C).

### 📔 Contributing
Feel free to fork this repository and submit pull requests with enhancements! Ideas for improvement:

Add wind direction to the leaf animation.
Include more weather effects (e.g., fog, thunderstorms).
Enhance the leaf design or add seasonal variations.

### 🎥 Credits
Built by: edis
Weather Data: Open-Meteo
Inspiration: Adapted from the concept of weather_landscape by lds133, reimagined as a web-based visualization.

### ⚖️ License
This project is open-source under the MIT License. Feel free to use, modify, and distribute it as you see fit!
