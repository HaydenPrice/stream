const twitch = window.Twitch.ext;

// Store a reference to the main countdown interval so we can clear it
let countdownInterval = null;

// Get references to DOM elements
const countdownValueEl = document.getElementById('countdown-value');
const weeklyScheduleEl = document.getElementById('weekly-schedule');
const subtitleEl = document.getElementById('subtitle');
const containerEl = document.querySelector('.container');
const messageContainerEl = document.getElementById('message-container');

// This function now takes the schedule as an argument
function findNextStreamDate(schedule) {
    const now = new Date();
    let nextStream = null;
    const potentialDates = [];

    if (!schedule || schedule.length === 0) {
        return null;
    }

    schedule.forEach(stream => {
        const streamTime = stream.time.split(':');
        const streamHour = parseInt(streamTime[0], 10);
        const streamMinute = parseInt(streamTime[1], 10);
        let nextDate = new Date();
        nextDate.setHours(streamHour, streamMinute, 0, 0);
        let dayDifference = stream.day - now.getDay();
        if (dayDifference < 0 || (dayDifference === 0 && nextDate.getTime() < now.getTime())) {
            dayDifference += 7;
        }
        nextDate.setDate(now.getDate() + dayDifference);
        potentialDates.push(nextDate);
    });

    potentialDates.sort((a, b) => a - b);
    return potentialDates.length > 0 ? potentialDates[0] : null;
}

// This function now takes the schedule as an argument
function populateWeeklySchedule(schedule, activeDay) {
    weeklyScheduleEl.innerHTML = '';
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    for (let i = 0; i < 7; i++) {
        const dayBlock = document.createElement('div');
        dayBlock.classList.add('day-block');
        if (i === activeDay) {
            dayBlock.classList.add('active');
        }

        const streamsOnThisDay = schedule ? schedule.filter(s => s.day === i) : [];

        const dot = document.createElement('div');
        dot.classList.add('dot');
        const dayName = document.createElement('div');
        dayName.classList.add('day-name');
        dayName.textContent = dayNames[i];
        const times = document.createElement('div');
        times.classList.add('times');

        if (streamsOnThisDay.length > 0) {
            streamsOnThisDay.forEach(s => {
                times.innerHTML += `<div>${s.time}</div>`;
            });
        } else {
            times.innerHTML = '<div>-</div>';
        }

        dayBlock.appendChild(dot);
        dayBlock.appendChild(dayName);
        dayBlock.appendChild(times);
        weeklyScheduleEl.appendChild(dayBlock);
    }
}

// This function now takes the schedule as an argument
function runCountdown(schedule) {
    // Clear any previous countdown
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    const nextStreamDate = findNextStreamDate(schedule);

    if (!nextStreamDate) {
        containerEl.style.display = 'none';
        messageContainerEl.style.display = 'block';
        messageContainerEl.textContent = "No streams scheduled!";
        populateWeeklySchedule([], -1); // Show an empty schedule
        return;
    }

    // Show the main container if it was hidden
    containerEl.style.display = 'block';
    messageContainerEl.style.display = 'none';

    populateWeeklySchedule(schedule, nextStreamDate.getDay());

    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = nextStreamDate.getTime() - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            containerEl.style.display = 'none';
            messageContainerEl.style.display = 'block';
            messageContainerEl.classList.add('live');
            messageContainerEl.textContent = "I'M LIVE NOW!";
            // After a while, check for the next stream again
            setTimeout(() => runCountdown(schedule), 60000);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const format = (num) => String(num).padStart(2, '0');
        countdownValueEl.textContent = `${format(days)}:${format(hours)}:${format(minutes)}:${format(seconds)}`;

    }, 1000);
}

// --- TWITCH EXTENSION LOGIC ---

// This function is called when the extension is authorized by Twitch
twitch.onAuthorized(function(auth) {
    // This is where you would get the broadcaster's saved configuration
    const broadcasterConfig = twitch.configuration.broadcaster;

    let schedule = [];
    if (broadcasterConfig && broadcasterConfig.content) {
        try {
            // The config is stored as a string, so we need to parse it
            const config = JSON.parse(broadcasterConfig.content);
            if (config.schedule) {
                schedule = config.schedule;
            }
        } catch (e) {
            // console.error("Error parsing broadcaster config:", e);
        }
    }

    // Start the countdown with the schedule from the config
    runCountdown(schedule);
});

// This function is called whenever the broadcaster saves a new configuration
twitch.configuration.onChanged(function() {
    const broadcasterConfig = twitch.configuration.broadcaster;

    let schedule = [];
    if (broadcasterConfig && broadcasterConfig.content) {
        try {
            const config = JSON.parse(broadcasterConfig.content);
            if (config.schedule) {
                schedule = config.schedule;
            }
        } catch (e) {
            // console.error("Error parsing broadcaster config:", e);
        }
    }

    // Restart the countdown with the new schedule
    runCountdown(schedule);
});
