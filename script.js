const MOBILE_BREAKPOINT = 480;
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const REVERSE_GEOCODING_API = "https://nominatim.openstreetmap.org/reverse";
let isCelsius = true;
let currentWeatherData = null;
let isZenMode = false;

const FALLBACK_WEATHER = {
  current: {
    temperature_2m: 20,
    relative_humidity_2m: 50,
    precipitation: 0,
    cloud_cover: 20,
    pressure_msl: 1013,
    wind_speed_10m: 5,
    wind_direction_10m: 90,
    is_day: 1,
  },
  hourly: { temperature_2m: Array(24).fill(20) },
};

function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall < delay) return;
    lastCall = now;
    return func.apply(this, args);
  };
}

document.getElementById("searchButton").addEventListener("click", getWeather);
document
  .getElementById("searchButton")
  .addEventListener("touchend", function (e) {
    e.preventDefault();
    getWeather();
  });

document
  .getElementById("geolocationButton")
  .addEventListener("click", async () => {
    if (!navigator.geolocation) {
      showError("Geolocation is not supported by your browser");
      return;
    }

    const errorMessage = document.getElementById("errorMessage");
    const searchButton = document.getElementById("searchButton");
    let loader;

    try {
      searchButton.disabled = true;
      errorMessage.style.display = "none";

      loader = document.createElement("div");
      loader.className = "loading-spinner";
      document.querySelector(".landscape").appendChild(loader);

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          maximumAge: 10000,
          timeout: 5000,
        });
      });

      const { latitude, longitude } = position.coords;
      const reverseGeoResponse = await fetch(
        `${REVERSE_GEOCODING_API}?format=json&lat=${latitude}&lon=${longitude}`,
        { headers: { "User-Agent": "WeatherLandscapeApp/1.0" } }
      );

      if (!reverseGeoResponse.ok) {
        throw new Error(
          `Reverse geocoding failed: ${reverseGeoResponse.status}`
        );
      }

      const reverseGeoData = await reverseGeoResponse.json();
      const cityName =
        reverseGeoData.address.city ||
        reverseGeoData.address.town ||
        reverseGeoData.address.village ||
        "Current Location";

      document.getElementById("cityInput").value = cityName;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const weatherUrl = `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,is_day&hourly=temperature_2m&forecast_days=1`;
      console.log("Fetching weather from:", weatherUrl);

      const weatherResponse = await fetch(weatherUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!weatherResponse.ok) {
        throw new Error(
          `Weather API failed: ${weatherResponse.status} - ${weatherResponse.statusText}`
        );
      }

      const weatherData = await weatherResponse.json();
      if (!weatherData.current) throw new Error("Weather data incomplete");

      currentWeatherData = weatherData;
      localStorage.setItem("lastCity", cityName);
      localStorage.setItem("lastWeather", JSON.stringify(weatherData));
      updateLandscape(weatherData);
    } catch (error) {
      console.error("Geolocation error:", error);
      let errorMsg = "Could not retrieve location";
      if (error.message.includes("denied")) {
        errorMsg = "Location permission denied";
      } else if (error.name === "AbortError") {
        errorMsg = "Location request timed out";
      } else if (error.message.includes("Weather API failed")) {
        errorMsg = "Weather service unavailable";
      }
      showError(errorMsg);

      if (error.name !== "AbortError") {
        currentWeatherData =
          JSON.parse(localStorage.getItem("lastWeather")) || FALLBACK_WEATHER;
        updateLandscape(currentWeatherData);
        showError(`${errorMsg}. Using cached data`);
      }
    } finally {
      searchButton.disabled = false;
      if (loader) loader.remove();
    }
  });

async function getWeather() {
  const cityName = document.getElementById("cityInput").value.trim();
  const errorMessage = document.getElementById("errorMessage");
  const searchButton = document.getElementById("searchButton");
  let loader;

  if (!cityName) {
    showError("Please enter a city name");
    return;
  }

  try {
    searchButton.disabled = true;
    errorMessage.style.display = "none";

    loader = document.createElement("div");
    loader.className = "loading-spinner";
    document.querySelector(".landscape").appendChild(loader);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const geoResponse = await fetch(
      `${GEOCODING_API}?name=${encodeURIComponent(
        cityName
      )}&count=1&language=en&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!geoResponse.ok) {
      throw new Error(`Geocoding failed: ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();
    if (!geoData.results?.length) {
      throw new Error("City not found");
    }

    const { latitude, longitude } = geoData.results[0];
    const weatherUrl = `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,is_day&hourly=temperature_2m&forecast_days=1`;
    console.log("Fetching weather from:", weatherUrl);

    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error(
        `Weather API failed: ${weatherResponse.status} - ${weatherResponse.statusText}`
      );
    }

    const weatherData = await weatherResponse.json();
    if (!weatherData.current || !weatherData.hourly) {
      throw new Error("Incomplete weather data");
    }

    currentWeatherData = weatherData;
    localStorage.setItem("lastCity", cityName);
    localStorage.setItem("lastWeather", JSON.stringify(weatherData));
    updateLandscape(weatherData);
  } catch (error) {
    console.error("Weather fetch error:", error);
    let errorMsg;
    switch (error.message) {
      case "City not found":
        errorMsg = "City not found!";
        break;
      case "AbortError":
        errorMsg = "Request timed out";
        break;
      case "Incomplete weather data":
        errorMsg = "Weather data incomplete";
        break;
      case error.message.match(/Geocoding failed/)?.input:
        errorMsg = "Location service unavailable";
        break;
      case error.message.match(/Weather API failed/)?.input:
        errorMsg = "Weather service unavailable";
        break;
      default:
        errorMsg = "Unable to fetch weather data";
    }
    showError(errorMsg);

    currentWeatherData =
      JSON.parse(localStorage.getItem("lastWeather")) || FALLBACK_WEATHER;
    updateLandscape(currentWeatherData);
    if (error.name !== "AbortError") {
      showError(`${errorMsg}. Using cached/fallback data`);
    }
  } finally {
    searchButton.disabled = false;
    if (loader) loader.remove();
  }
}

function showError(message) {
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  setTimeout(() => (errorMessage.style.display = "none"), 3000);
}

async function fetchLocationSuggestions(query) {
  if (query.length < 2) {
    document.getElementById("autocomplete-list").style.display = "none";
    return;
  }

  try {
    const response = await fetch(
      `${GEOCODING_API}?name=${encodeURIComponent(
        query
      )}&count=5&language=en&format=json`
    );
    if (!response.ok) throw new Error("Autocomplete fetch failed");
    const data = await response.json();
    const suggestions = data.results || [];
    displaySuggestions(suggestions);
  } catch (error) {
    console.error("Autocomplete error:", error);
    document.getElementById("autocomplete-list").style.display = "none";
  }
}

function displaySuggestions(suggestions) {
  const autocompleteList = document.getElementById("autocomplete-list");
  autocompleteList.innerHTML = "";

  if (suggestions.length === 0) {
    autocompleteList.style.display = "none";
    return;
  }

  suggestions.forEach((suggestion) => {
    const div = document.createElement("div");
    const displayName = `${suggestion.name}${
      suggestion.country ? ", " + suggestion.country : ""
    }`;
    div.textContent = displayName;
    div.addEventListener("click", () => {
      document.getElementById("cityInput").value = suggestion.name;
      autocompleteList.style.display = "none";
      getWeather();
    });
    autocompleteList.appendChild(div);
  });

  autocompleteList.style.display = "block";
}

function getWeatherMessage(weather) {
  if (weather.current.precipitation > 0) {
    return "A gentle rain to wash away worries";
  } else if (weather.current.cloud_cover < 30 && weather.current.is_day) {
    return "A clear day to brighten your spirit";
  } else if (weather.current.cloud_cover > 70) {
    return "Clouds to cradle your dreams";
  } else if (!weather.current.is_day) {
    return "A peaceful night to rest and restore";
  } else {
    return "A calm moment to breathe and be";
  }
}

function toggleZenMode() {
  isZenMode = !isZenMode;
  const zenToggle = document.getElementById("zen-toggle");
  const inputGroup = document.querySelector(".input-group");
  const weatherInfo = document.querySelector(".weather-info");
  const weatherMessage = document.getElementById("weather-message");
  const toggleButton = document.querySelector(".toggle-button");
  const labels = document.querySelectorAll(".temperature-label");
  const errorMessage = document.getElementById("errorMessage");

  zenToggle.textContent = isZenMode ? "Exit Zen" : "Zen Mode";
  inputGroup.style.opacity = isZenMode ? "0" : "1";
  weatherInfo.style.opacity = isZenMode ? "0" : "1";
  weatherMessage.style.opacity = isZenMode ? "0" : "1";
  toggleButton.style.opacity = isZenMode ? "0" : "1";
  labels.forEach((label) => (label.style.opacity = isZenMode ? "0" : "1"));
  errorMessage.style.opacity = isZenMode ? "0" : "1";

  inputGroup.style.pointerEvents = isZenMode ? "none" : "auto";
  weatherInfo.style.pointerEvents = isZenMode ? "none" : "auto";
  weatherMessage.style.pointerEvents = isZenMode ? "none" : "auto";
  toggleButton.style.pointerEvents = isZenMode ? "none" : "auto";
}

function updateTerrainPath(temperatures) {
  const terrain = document.querySelector(".terrain");
  const path = terrain.querySelector(".terrain-path");
  const width = 1000;
  const height = 400;
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  const minTemp = Math.min(...temperatures, -20);
  const maxTemp = Math.max(...temperatures, 40);
  const tempRange = maxTemp - minTemp || 1;

  const points = temperatures.map((temp, i) => {
    const x = (i / (temperatures.length - 1)) * width;
    const y = height * (1 - ((temp - minTemp) / tempRange) * 0.8) - 40;
    return `${x},${Math.max(0, Math.min(height, y))}`;
  });

  path.setAttribute(
    "d",
    `M0,${height} L${points.join(" L")} L${width},${height} Z`
  );

  const avgTemp = temperatures.reduce((a, b) => a + b) / temperatures.length;
  terrain.style.fill =
    avgTemp < 0 ? "url(#snowGradient)" : "url(#terrainGradient)";

  document.querySelectorAll(".temperature-label").forEach((el) => el.remove());
  const timeIndices = [0, 6, 12, 18, 23];
  timeIndices.forEach((index) => {
    if (index < temperatures.length) {
      const temp = temperatures[index];
      const displayTemp = isCelsius ? temp : (temp * 9) / 5 + 32;
      const label = document.createElement("div");
      label.className = "temperature-label";
      label.textContent = `${Math.round(displayTemp)}°${isCelsius ? "C" : "F"}`;
      const positions = isMobile ? [5, 27, 50, 73, 95] : [2, 25, 50, 75, 97];
      label.style.left = `${positions[timeIndices.indexOf(index)]}%`;
      label.style.bottom = `${((temp - minTemp) / tempRange) * 40 + 15}%`;
      document.querySelector(".landscape").appendChild(label);
    }
  });

  if (isZenMode) {
    document
      .querySelectorAll(".temperature-label")
      .forEach((label) => (label.style.opacity = "0"));
  }
}

const updateLandscape = throttle(function (weather) {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const adjustedTemp = isCelsius
    ? weather.current.temperature_2m
    : (weather.current.temperature_2m * 9) / 5 + 32;
  const weatherInfo = document.querySelector(".weather-info");
  const weatherMessage = document.getElementById("weather-message");
  const waterReflection = document.getElementById("water-reflection");

  weatherInfo.innerHTML = isMobile
    ? `<div>Temp: ${adjustedTemp.toFixed(1)}°${isCelsius ? "C" : "F"}</div>
       <div>Humidity: ${weather.current.relative_humidity_2m}%</div>
       <div>Wind: ${weather.current.wind_speed_10m} m/s</div>`
    : `<div>Temperature: ${adjustedTemp.toFixed(1)}°${
        isCelsius ? "C" : "F"
      }</div>
       <div>Humidity: ${weather.current.relative_humidity_2m}%</div>
       <div>Wind: ${weather.current.wind_speed_10m} m/s</div>
       <div>Clouds: ${weather.current.cloud_cover}%</div>
       <div>Pressure: ${weather.current.pressure_msl} hPa</div>
       <div>Precipitation: ${weather.current.precipitation} mm</div>`;

  updateTerrainPath(weather.hourly.temperature_2m);

  const sky = document.querySelector(".sky");
  const cloudiness = weather.current.cloud_cover;
  const isDay = weather.current.is_day;

  sky.style.background = `linear-gradient(to bottom, 
    rgba(${isDay ? "179,216,245" : "100,149,237"},${1 - cloudiness / 150}),
    rgba(${isDay ? "230,240,255" : "135,206,235"},${1 - cloudiness / 150}))`;

  const sun = document.querySelector(".sun");
  sun.style.background = isDay ? "#fff0b3" : "#e6f0ff";
  sun.style.opacity = (isDay ? 1 : 0.8) - cloudiness / 150;

  document
    .querySelectorAll(".cloud, .rain, .snow")
    .forEach((el) => el.remove());

  if (cloudiness > 0) {
    const numClouds = Math.ceil(cloudiness / (isMobile ? 25 : 20));
    for (let i = 0; i < numClouds; i++) {
      const cloud = document.createElement("div");
      cloud.className = "cloud";

      const baseWidth =
        Math.random() * (isMobile ? 80 : 100) + (isMobile ? 60 : 100);
      const baseHeight =
        Math.random() * (isMobile ? 30 : 40) + (isMobile ? 20 : 30);

      for (let j = 0; j < 3; j++) {
        const cloudPart = document.createElement("div");
        cloudPart.className = "cloud-part";
        cloudPart.style.width = `${baseWidth * (0.7 + j * 0.2)}px`;
        cloudPart.style.height = `${baseHeight * (0.8 + j * 0.1)}px`;
        cloudPart.style.left = `${j * 20}px`;
        cloudPart.style.bottom = `${j * 5}px`;
        cloudPart.style.opacity = `${0.9 - j * 0.2}`;
        cloudPart.style.background = `rgba(255, 255, 255, ${0.9 - j * 0.1})`;
        cloud.appendChild(cloudPart);
      }

      cloud.style.left = `${Math.random() * 100}%`;
      cloud.style.top = `${Math.random() * (isMobile ? 150 : 200)}px`;
      cloud.style.animationDuration = `${
        Math.random() * 10 + (isMobile ? 20 : 30)
      }s`;
      document.querySelector(".landscape").appendChild(cloud);
    }
  }

  if (weather.current.precipitation > 0) {
    const maxElements = isMobile ? 100 : 200;
    const precip = weather.current.precipitation;
    const isSnow = weather.current.temperature_2m < 0;

    for (
      let i = 0;
      i < Math.min(precip * (isSnow ? 30 : 15), maxElements);
      i++
    ) {
      const precipElement = document.createElement("div");
      precipElement.className = isSnow ? "snow" : "rain";
      precipElement.style.left = `${Math.random() * 100}%`;
      if (isSnow) {
        precipElement.style.width = precipElement.style.height = isMobile
          ? "4px"
          : "6px";
      } else {
        precipElement.style.height = `${
          Math.random() * (isMobile ? 15 : 20) + 10
        }px`;
        precipElement.style.width = isMobile ? "1px" : "2px";
      }
      document.querySelector(".landscape").appendChild(precipElement);
    }
    waterReflection.style.display = "block";
  } else {
    waterReflection.style.display = "none";
  }

  weatherMessage.textContent = getWeatherMessage(weather);

  if (isZenMode) {
    toggleZenMode();
    toggleZenMode();
  }
}, 100);

function toggleTemperature() {
  isCelsius = !isCelsius;
  if (currentWeatherData) {
    updateLandscape(currentWeatherData);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const cachedCity = localStorage.getItem("lastCity");
  if (cachedCity) document.getElementById("cityInput").value = cachedCity;

  const cachedWeather = localStorage.getItem("lastWeather");
  if (cachedWeather) {
    currentWeatherData = JSON.parse(cachedWeather);
    updateLandscape(currentWeatherData);
  }

  const cityInput = document.getElementById("cityInput");
  cityInput.addEventListener(
    "input",
    throttle(() => {
      fetchLocationSuggestions(cityInput.value);
    }, 300)
  );

  cityInput.addEventListener("blur", () => {
    setTimeout(() => {
      document.getElementById("autocomplete-list").style.display = "none";
    }, 200);
  });

  document
    .getElementById("zen-toggle")
    .addEventListener("click", toggleZenMode);
});

window.addEventListener("online", () => navigator.onLine && getWeather());
window.addEventListener("offline", () =>
  showError("Offline - Using cached data")
);

document.getElementById("cityInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") getWeather();
});

document.getElementById("cityInput").addEventListener("blur", () => {
  window.scrollTo(0, 0);
});
