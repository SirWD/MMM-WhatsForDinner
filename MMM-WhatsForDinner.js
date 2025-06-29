// Mapping OpenMeteo weather codes to WeatherAPI icon codes
const weatherCodeToIcon = {
	0: "wi-day-sunny", 1: "wi-day-sunny-overcast", 2: "wi-day-cloudy", 3: "wi-cloudy",
	45: "wi-fog", 48: "wi-fog", 51: "wi-showers", 53: "wi-showers", 55: "wi-showers",
	56: "wi-showers", 57: "wi-showers", 61: "wi-raindrops", 63: "wi-rain",
	65: "wi-rain-wind", 66: "wi-sleet", 67: "wi-sleet", 71: "wi-snow", 73: "wi-snow",
	75: "wi-snow-wind", 77: "wi-snowflake-cold", 80: "wi-showers", 81: "wi-rain",
	82: "wi-rain-wind", 95: "wi-thunderstorm", 96: "wi-thunderstorm", 99: "wi-thunderstorm"
};

Module.register("MMM-WhatsForDinner", {
	defaults: {
		header: "What's for dinner",
		numPortions: 4,
		maxPrepTime: 30,
		numSuggestions: 3,
		dietaryRestrictions: [],
		language: "en"
	},


	start() {
		this.loaded = true;
		this.suggestions = [];
		this.config = {
			...this.defaults,
			...this.config
		};
		this.getData();
		this.scheduleUpdate();
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "MMM-whatsfordinner";

		this.voteResults = {}; // Store current vote tallies per date

		this.suggestions.forEach(dayData => {
			const weekRow = document.createElement("div");
			weekRow.className = "week-row";

			// Weather Section
			const weatherSection = document.createElement('div');
			weatherSection.className = 'weather-section';

			const dayDiv = document.createElement('div');
			dayDiv.className = 'weather-day';
			dayDiv.textContent = dayData.day;


			/*
			const weatherIcon = document.createElement('img');
			weatherIcon.className = 'weather-icon';

			weatherIcon.src = dayData.icon;
			weatherIcon.onerror = function () {
				weatherIcon.onerror = null; // prevent infinite recursion
				weatherIcon.src = "/modules/MMM-whatsfordinner/icons/placeholder.png";
			};
			weatherIcon.alt = 'Weather Icon';
			*/

			const iconClass = weatherCodeToIcon[dayData.code] || "wi-na";

			const weatherIcon = document.createElement("i");
			weatherIcon.className = `wi ${iconClass}`;

			const weatherTemp = document.createElement('div');
			weatherTemp.className = 'weather-temp';
			weatherTemp.textContent = `${dayData.temp}°C`;

			weatherSection.appendChild(dayDiv);
			const weatherIconWrapper = document.createElement('div');
			weatherIconWrapper.className = 'weather-icon-wrapper';

			weatherSection.appendChild(weatherIcon);
			weatherSection.appendChild(weatherTemp);
			//weatherSection.appendChild(weatherIconWrapper);

			// Menu Section
			const menuSection = document.createElement('div');
			menuSection.className = 'menu-section';

			dayData.meals.forEach(meal => {
				const menuDiv = document.createElement('div');
				menuDiv.className = 'menu-item';

				const menuName = document.createElement('span');
				menuName.className = 'menu-name';
				menuName.textContent = meal.name;

				const votingButtons = document.createElement('div');
				votingButtons.className = 'voting-buttons';

				const upVote = document.createElement('button');

				const upIcon = document.createElement('i');
				upIcon.classList.add('far', 'fa-thumbs-up');

				upVote.appendChild(upIcon);


				upVote.onclick = () => {
					this.sendSocketNotification("REGISTER_VOTE", {
						date: day.date,
						mealName: meal.name,
						voteType: "up"
					});
				};

				const downVote = document.createElement('button');
				const downIcon = document.createElement('i');
				downIcon.classList.add('far', 'fa-thumbs-down');

				downVote.appendChild(downIcon);

				downVote.onclick = () => {
					this.sendSocketNotification("REGISTER_VOTE", {
						date: day.date,
						mealName: meal.name,
						voteType: "down"
					});
				};

				votingButtons.appendChild(upVote);
				votingButtons.appendChild(downVote);

				menuDiv.appendChild(menuName);
				menuDiv.appendChild(votingButtons);
				menuSection.appendChild(menuDiv);
			});

			weekRow.appendChild(weatherSection);
			weekRow.appendChild(menuSection);
			wrapper.appendChild(weekRow);

		});
		return wrapper;
	},

	getStyles() {
		return [
			this.file("css/MMM-whatsfordinner.css"),
			"https://cdnjs.cloudflare.com/ajax/libs/weather-icons/2.0.10/css/weather-icons.min.css"
		];
	},

	getHeader() {
		return "Qu'est-ce qu'on mange ?";
	},

	getData() {
		this.sendSocketNotification("FETCH_WHATSFORDINNER", this.config);
	},

	scheduleUpdate() {
		const interval = (this.config.refreshInterval || 24) * 60 * 60 * 1000; // default 24h
		setInterval(() => {
			this.getData();
		}, interval);
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "WHATSFORDINNER_RESULT") {
			this.suggestions = payload;
			this.loaded = true;
			this.updateDom();
		}

		if (notification === "VOTE_UPDATE") {
			this.voteResults[payload.date] = payload.votes;
			this.updateDom(); // Rerender with updated votes
		}
	},

});
