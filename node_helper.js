const NodeHelper = require("node_helper");
const axios = require("axios");
const { powerMonitor } = require("electron");
const voteStore = {}; // { "2025-06-28": { "Meal A": { up: 3, down: 1 }, ... } }


// Mapping OpenMeteo weather codes to Weather Icon fonts
const weatherCodeToIcon = {
  0: "wi-day-sunny", 1: "wi-day-sunny-overcast", 2: "wi-day-cloudy", 3: "wi-cloudy",
  45: "wi-fog", 48: "wi-fog",
  51: "wi-showers", 53: "wi-showers", 55: "wi-showers", 56: "wi-showers", 57: "wi-showers",
  61: "wi-raindrops", 63: "wi-rain", 65: "wi-rain-wind", 66: "wi-sleet", 67: "wi-sleet",
  71: "wi-snow", 73: "wi-snow", 75: "wi-snow-wind", 77: "wi-snowflake-cold",
  80: "wi-showers", 81: "wi-rain", 82: "wi-rain-wind",
  95: "wi-thunderstorm", 96: "wi-thunderstorm", 99: "wi-thunderstorm"
};

// Get full WeatherAPI icon URL from weather code
function getWeatherIconUrl(code) {
  const icon = weatherCodeToIcon[code] || "113"; // Fallback: sunny
  return `${icon}`;
}

// Fetch weather forecast from Open-Meteo API for the specified location and number of days
async function fetchOpenMeteoForecast(latitude, longitude, days, locale) {
  console.log(`[DEBUG MMM-WhatsForDinner] Fetching Open-Meteo forecast for ${latitude}, ${longitude} for ${days} days in ${locale}`);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,weathercode&timezone=auto`;
  const response = await axios.get(url);
  const { daily } = response.data;

  // Build simplified forecast objects
  return Array.from({ length: days }).map((_, i) => ({
    label: new Date(daily.time[i]).toLocaleDateString(locale, { weekday: "long" }),
    date: daily.time[i],
    temp: Math.round(daily.temperature_2m_max[i]),
    code: daily.weathercode[i],
    icon: getWeatherIconUrl(daily.weathercode[i])
  }));
}

// Fetch a set of random meals from TheMealDB API (not used by AI logic, but available)
async function fetchRandomMeals(count) {
  const results = [];

  for (let i = 0; i < count; i++) {
    try {
      const response = await axios.get("https://www.themealdb.com/api/json/v1/1/random.php");
      const meal = response.data.meals[0];
      results.push({
        name: meal.strMeal,
        image: meal.strMealThumb,
        category: meal.strCategory,
        area: meal.strArea,
        instructions: meal.strInstructions
      });
    } catch (error) {
      console.error("Failed to fetch random meal:", error.message);
    }
  }

  return results;
}

// Build a weekly AI prompt using the weather and config (portion size, prep time, restrictions)
function buildWeeklyAIPrompt(weatherDays, config) {
  const { numPortions, maxPrepTime, numSuggestions, dietaryRestrictions = [], language } = config;


  const restrictionText = dietaryRestrictions.length > 0
    ? `Meals must not contains: ${dietaryRestrictions.join(", ")}.`
    : "";

  const dateWeatherLines = weatherDays.map(day =>
    `- ${day.date}: ${day.temp}°C ${day.code}`
  ).join("\n");

  return `
  Provide ${numSuggestions} dinner main course suggestions per day for the following dates.

  Each meal must:
    - Be suitable for a family of ${numPortions}
    - Take less than ${maxPrepTime} minutes to prepare
    - Use common ingredients
    - ${restrictionText}

  Respond with only raw JSON, no markdown and no code blocks. Use this exact JSON format:
  {
    "dinner_choices": {
      "YYYY-MM-DD": [
        {
          "name": "Meal Name",
          "ingredients": ["ingredient 1", "ingredient 2"],
          "prep_time": "Preparation time in minutes",
          "instructions": ["Step 1", "Step 2"]
        },
        ...
      ]
    }
  }

  Here is the weather forecast:
  ${dateWeatherLines}

  Don't repeat meals.
  
  If you can't suggest meals for a date, use an empty array for that day.

  Translate your answer to ${config.language}.
  
  `.trim();
}

// Send prompt to Groq API and parse structured JSON response
async function fetchAIMealSuggestionsGpt4(promptText, apiKey) {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) throw new Error("Groq API key is missing.");

  const payload = {
    model: "llama-3.3-70b-versatile",

    messages: [
      {
        role: "user",
        content: promptText
      }
    ],
    temperature: 0.7,
    max_tokens: 2048
  };

  console.log(`[DEBUG MMM-WhatsForDinner] Sending to groq:`, JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    });

    let result = response.data.choices[0].message.content.trim();

    // ✅ Remove surrounding code block markers if present
    if (result.startsWith("```")) {
      result = result.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    }

    let parsed;

    try {
      parsed = JSON.parse(result);
    } catch (jsonError) {
      console.error("[MMM-WhatsForDinner] Failed to parse AI JSON response:");
      console.error(result); // Print full result for debugging
      throw jsonError;
    }

    return parsed.dinner_choices || {};
  } catch (err) {
    console.error("[MMM-WhatsForDinner] Groq GPT-4 meal API error:", err.message);
    return {};
  }

}

function registerVote({ date, mealName, voteType }) {
  if (!voteStore[date]) voteStore[date] = {};
  if (!voteStore[date][mealName]) voteStore[date][mealName] = { up: 0, down: 0 };

  if (voteType === "up") voteStore[date][mealName].up += 1;
  if (voteType === "down") voteStore[date][mealName].down += 1;

  // Broadcast updated votes to the frontend
  this.sendSocketNotification("VOTE_UPDATE", {
    date,
    votes: voteStore[date]
  });
}


// Main MagicMirror module helper
module.exports = NodeHelper.create({

  // Listen for socket messages from the frontend
  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_WHATSFORDINNER") {
      this.generateSuggestions(payload);
    }

    if (notification === "REGISTER_VOTE") {
      this.registerVote(payload);
    }
  },

  // Fetch weather forecast and generate AI meal suggestions
  async generateSuggestions(config) {

    try {
      const apiKey = config.groqApiKey;
      if (!apiKey) {
        console.error("[MMM-WhatsForDinner] Groq API key is missing in config.");
        return;
      }
      if (!config.lat || !config.lon) {
        console.error("[MMM-WhatsForDinner] Latitude and longitude must be provided in config.");
        return;
      }
      if (!config.numPortions || !config.maxPrepTime || !config.numSuggestions) {
        console.error("[MMM-WhatsForDinner] Missing required config parameters: numPortions, maxPrepTime, numSuggestions.");
        return;
      }


      // 1. Get weather forecast for next N days
      const weather = await fetchOpenMeteoForecast(
        config.lat,
        config.lon,
        config.forecastDays || 7,
        config.locale || "en-US"
      );


      // 2. Build GPT prompt from weather data
      const prompt = buildWeeklyAIPrompt(weather, config);

      // 3. Get AI-generated meals per day
      const mealsByDate = await fetchAIMealSuggestionsGpt4(prompt, apiKey);

      // 4. Build UI-friendly response structure
      const suggestions = weather.map(day => {
        const meals = (mealsByDate[day.date] || []).map(m => ({
          name: m.name,
          ingredients: m.ingredients,
          prepTime: m.prep_time,
          instructions: m.instructions
        }));

        return {
          day: day.label,
          temp: day.temp,
          code: day.code,
          icon: day.icon,
          meals
        };
      });

      // 5. Send back to frontend
      console.log("Sending to frontend:", JSON.stringify(suggestions, null, 2));
      this.sendSocketNotification("WHATSFORDINNER_RESULT", suggestions);

    } catch (err) {
      console.error("[MMM-WhatsForDinner] Error generating suggestions:", err.message);
    }
  }
});
