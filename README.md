
# 🍽️ MMM-WhatsForDinner

**MMM-WhatsForDinner** is a MagicMirror² module that uses AI to suggest personalized dinner ideas based on your local weather, food preferences, and household needs. Let your smart mirror help answer the daily "what's for dinner?" question — intelligently.

## ✨ Features

- 🔮 AI-powered meal suggestions
- 🌦️ Context-aware: Adapts to current and forecasted weather
- 🥗 Dietary restrictions support (e.g., no pork, no nuts)
- 🕒 Customizable prep time and number of portions
- 📅 Daily or weekly view
- 🌍 Multi-language support
- 🔁 Automatic updates

---

## 📦 Installation

Open a terminal on your MagicMirror installation and run:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/SirWD/MMM-WhatsForDinner.git
cd MMM-WhatsForDinner
npm install
```

## 🔧 Configuration

Add the module to your `config.js` file:

```js
{
  module: "MMM-WhatsForDinner",
  position: "top_left",
  config: {
    lat: 40.7127,
    lon: -74.0059,
    forecastDays: 3,
    maxPrepTime: 30,
    numPortions: 4,
    numSuggestions: 2,
    dietaryRestrictions: ["pork"],
    groqApiKey: "YOUR_GROQ_API_KEY",
    language: "en"
  }
}
```

### Configuration Options

| Option                | Type      | Description                                                      | Default      |
|-----------------------|-----------|------------------------------------------------------------------|--------------|
| `lat`                 | float     | Latitude for weather-based suggestions                           | **Required** |
| `lon`                 | float     | Longitude                                                        | **Required** |
| `forecastDays`        | int       | Number of forecast days to show meals for                        | `7`          |
| `maxPrepTime`         | int       | Maximum prep time per meal in minutes                            | `30`         |
| `numPortions`         | int       | Number of portions per meal                                      | `4`          |
| `numSuggestions`      | int       | Number of suggestions per day                                    | `2`          |
| `dietaryRestrictions` | array     | Array of restrictions, e.g., `["eggs", "nuts"]`                  | `[]`         |
| `groqApiKey`          | string    | API key for AI (Groq)                                            | **Required** |
| `language`            | string    | Optional: force module language (`"fr"`, `"en"`, etc.)           | `en`         |

---

## 🧠 How it Works

1. Fetches local weather forecast using Open-Meteo via RapidAPI.
2. Builds a contextual prompt combining forecast and user config.
3. Uses Groq GPT-4 to generate daily meal suggestions.
4. Displays suggestions on the mirror

---

## 📸 Screenshots

> *COMING SOON*

---

## 🔐 API Keys Required

- **Groq API Key**: Get one at [https://console.groq.com](https://console.groq.com)

Add key in your module config.

---

## 📅 Future Improvements (Planned)

- 🔄 Manual refresh button
- 📜 Recipe links or instructions
- 🛒 Auto-generated shopping list
- 🗳️ Voting System (Each suggested meal can be upvoted or downvoted. The most popular meal per day is highlighted.) 

---

## 📃 License

MIT License

---

## 💬 Contributing

Pull requests and suggestions welcome. Feel free to fork, improve, and share!

---

## 🙌 Acknowledgements

- [MagicMirror²](https://github.com/MichMich/MagicMirror)
- [Groq GPT-4 API](https://console.groq.com)
- [Open-Meteo on RapidAPI](https://rapidapi.com/open-meteo)
