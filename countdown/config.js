const twitch = window.Twitch.ext;
const scheduleContainer = document.getElementById('schedule-container');
const saveBtn = document.getElementById('save-btn');
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Function to create the HTML for a single day's configuration
function createDayConfig(dayIndex) {
    const dayName = dayNames[dayIndex];
    const dayConfigDiv = document.createElement('div');
    dayConfigDiv.classList.add('day-config');
    dayConfigDiv.dataset.dayIndex = dayIndex;

    dayConfigDiv.innerHTML = `
        <div class="day-header">
            <h2>${dayName}</h2>
            <button class="add-time-btn">Add Time</button>
        </div>
        <div class="times-list"></div>
    `;

    scheduleContainer.appendChild(dayConfigDiv);
}

// Function to add a time input field to a day's list
function addTimeEntry(dayIndex, timeValue = '') {
    const dayConfig = document.querySelector(`.day-config[data-day-index='${dayIndex}']`);
    if (!dayConfig) return; // Safety check
    const timesList = dayConfig.querySelector('.times-list');

    const timeEntryDiv = document.createElement('div');
    timeEntryDiv.classList.add('time-entry');
    timeEntryDiv.innerHTML = `
        <input type="time" class="time-input" value="${timeValue}">
        <button class="remove-time-btn">Remove</button>
    `;
    timesList.appendChild(timeEntryDiv);
}

// This function will be called only by the reliable onChanged listener.
function populateUIFromConfig() {
    console.log("Populating UI from config...");
    // Clear any existing time entries to prevent duplicates
    const allTimeEntries = document.querySelectorAll('.time-entry');
    allTimeEntries.forEach(entry => entry.remove());

    const broadcasterConfig = twitch.configuration.broadcaster;
    console.log("Current broadcaster config object:", broadcasterConfig);

    if (broadcasterConfig && broadcasterConfig.content) {
        console.log("Found config content:", broadcasterConfig.content);
        try {
            const config = JSON.parse(broadcasterConfig.content);
            if (config.schedule && Array.isArray(config.schedule)) {
                config.schedule.forEach(stream => {
                    addTimeEntry(stream.day, stream.time);
                });
            }
        } catch (e) {
            console.error("Error parsing config:", e);
        }
    } else {
        console.log("No config content found to populate.");
    }
}


// --- EVENT LISTENERS ---

// Handle clicks within the main schedule container
scheduleContainer.addEventListener('click', function(event) {
    if (event.target.classList.contains('add-time-btn')) {
        const dayIndex = event.target.closest('.day-config').dataset.dayIndex;
        addTimeEntry(dayIndex);
    }
    if (event.target.classList.contains('remove-time-btn')) {
        event.target.closest('.time-entry').remove();
    }
});

// Handle click on the main "Save" button
saveBtn.addEventListener('click', function() {
    const newSchedule = [];
    const allDayConfigs = document.querySelectorAll('.day-config');

    allDayConfigs.forEach(dayConfig => {
        const dayIndex = parseInt(dayConfig.dataset.dayIndex, 10);
        const allTimeInputs = dayConfig.querySelectorAll('.time-input');

        allTimeInputs.forEach(timeInput => {
            if (timeInput.value) {
                newSchedule.push({
                    day: dayIndex,
                    time: timeInput.value
                });
            }
        });
    });

    const contentToSave = JSON.stringify({ schedule: newSchedule });

    // Use the Twitch Configuration service to save the data
    twitch.configuration.set(
        'broadcaster', // segment
        '1.0', // version
        contentToSave
    );

    // Provide visual feedback
    saveBtn.textContent = 'Saved!';
    saveBtn.classList.add('saved');
    setTimeout(() => {
        saveBtn.textContent = 'Save Schedule';
        saveBtn.classList.remove('saved');
    }, 2000);
});


// --- TWITCH EXTENSION LOGIC ---

// Create the UI as soon as the script loads.
for (let i = 0; i < 7; i++) {
    createDayConfig(i);
}

// When the extension is authorized
twitch.onAuthorized(function(auth) {
    console.log("Config page authorized.");
});

// This listener is the most reliable way to get configuration data.
twitch.configuration.onChanged(function() {
    console.log("--- onChanged Fired. Waiting 100ms before reading config... ---");
    setTimeout(populateUIFromConfig, 100); // Add a small delay
});
