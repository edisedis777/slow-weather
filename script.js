const MOBILE_BREAKPOINT = 480;
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
let isCelsius = true;
let currentWeatherData = null;

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

document
  .getElementById("searchButton")
  .addEventListener("touchend", function (e) {
    e.preventDefault();
    getWeather();
  });

async function getWeather() {
  const cityName = document.getElementById("cityInput").value.trim();
  const errorMessage = document.getElementById("errorMessage");
  const searchButton = document.getElementById("searchButton");

  if (!cityName) {
    showError("Please enter a city name");
    return;
  }

  try {
    searchButton.disabled = true;
    errorMessage.style.display = "none";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const geoResponse = await fetch(
      `${GEOCODING_API}?name=${encodeURIComponent(
        cityName
      )}&count=1&language=en&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    const geoData = await geoResponse.json();
    if (!geoData.results?.length) {
      showError("City not found!");
      return;
    }

    const { latitude, longitude } = geoData.results[0];
    const weatherResponse = await fetch(
      `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,is_day&hourly=temperature_2m&forecast_days=1`
    );

    const weatherData = await weatherResponse.json();
    if (!weatherData.current || !weatherData.hourly)
      throw new Error("Incomplete data");

    currentWeatherData = weatherData;
    localStorage.setItem("lastCity", cityName);
    localStorage.setItem("lastWeather", JSON.stringify(weatherData));
    updateLandscape(weatherData);
  } catch (error) {
    console.error("Error:", error);
    showError(
      error.name === "AbortError" ? "Request timed out" : "Using fallback data"
    );
    currentWeatherData =
      JSON.parse(localStorage.getItem("lastWeather")) || FALLBACK_WEATHER;
    updateLandscape(currentWeatherData);
  } finally {
    searchButton.disabled = false;
  }
}

function showError(message) {
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  setTimeout(() => (errorMessage.style.display = "none"), 3000);
}

function updateTerrainPath(temperatures) {
  const svg = document.querySelector(".terrain");
  const path = svg.querySelector(".terrain-path");
  const topStop = svg.querySelector(".terrain-top");
  const bottomStop = svg.querySelector(".terrain-bottom");
  const width = 1000,
    height = 400;
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  const points = temperatures.map((temp, i) => {
    const x = (i / (temperatures.length - 1)) * width;
    const y = height - (((temp + 20) / 60) * height * 0.6 + height * 0.2);
    return `${x} ${y}`;
  });

  path.setAttribute(
    "d",
    `M0 ${height} L${points.join(" L")} L${width} ${height} Z`
  );

  const avgTemp = temperatures.reduce((a, b) => a + b) / temperatures.length;
  topStop.style.stopColor = avgTemp < 0 ? "#ffffff" : "#4caf50";
  bottomStop.style.stopColor = avgTemp < 0 ? "#d3d3d3" : "#2e7d32";

  document.querySelectorAll(".temperature-label").forEach((el) => el.remove());
  temperatures.forEach((temp, i) => {
    if (i % (isMobile ? 4 : 6) === 0) {
      const displayTemp = isCelsius ? temp : (temp * 9) / 5 + 32;
      const label = document.createElement("div");
      label.className = "temperature-label";
      label.textContent = `${Math.round(displayTemp)}°${isCelsius ? "C" : "F"}`;
      label.style.left = `${(i / (temperatures.length - 1)) * 100}%`;
      label.style.bottom = `${((temp + 20) / 60) * 40 + 10}%`;
      document.querySelector(".landscape").appendChild(label);
    }
  });
}

const updateLandscape = throttle(function (weather) {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const adjustedTemp = isCelsius
    ? weather.current.temperature_2m
    : (weather.current.temperature_2m * 9) / 5 + 32;
  const weatherInfo = document.querySelector(".weather-info");

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
        rgba(${isDay ? "135,206,235" : "25,25,112"},${1 - cloudiness / 150}),
        rgba(${isDay ? "182,227,255" : "65,105,225"},${1 - cloudiness / 150}))`;

  const sun = document.querySelector(".sun");
  sun.style.background = isDay ? "#FFD700" : "#FFFFFF";
  sun.style.opacity = (isDay ? 1 : 0.8) - cloudiness / 150;

  document
    .querySelectorAll(".cloud, .rain, .snow")
    .forEach((el) => el.remove());

  if (cloudiness > 0) {
    const numClouds = Math.ceil(cloudiness / (isMobile ? 25 : 20));
    for (let i = 0; i < numClouds; i++) {
      const cloud = document.createElement("div");
      cloud.className = "cloud";
      cloud.style.width = `${
        Math.random() * (isMobile ? 80 : 100) + (isMobile ? 60 : 100)
      }px`;
      cloud.style.height = `${
        Math.random() * (isMobile ? 30 : 40) + (isMobile ? 30 : 40)
      }px`;
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
});

window.addEventListener("online", () => navigator.onLine && getWeather());
window.addEventListener("offline", () =>
  showError("Using cached data (offline)")
);

document.getElementById("cityInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") getWeather();
});

document.getElementById("cityInput").addEventListener("blur", () => {
  window.scrollTo(0, 0);
});
