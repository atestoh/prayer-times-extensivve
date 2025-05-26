document.addEventListener('DOMContentLoaded', () => {
    // --- UI Element References ---
    const locationDisplay = document.querySelector('.location-display');
    const dateDisplay = document.querySelector('.date-display');

    const fajrTime = document.getElementById('fajr-time');
    const sunriseTime = document.getElementById('sunrise-time');
    const dhuhrTime = document.getElementById('dhuhr-time');
    const asrTime = document.getElementById('asr-time');
    const maghribTime = document.getElementById('maghrib-time');
    const ishaTime = document.getElementById('isha-time');

    const fajrPermissibleEnd = document.getElementById('fajr-permissible-end');
    const dhuhrPermissibleEnd = document.getElementById('dhuhr-permissible-end');
    const asrPermissibleEnd = document.getElementById('asr-permissible-end');
    const maghribPermissibleEnd = document.getElementById('maghrib-permissible-end');
    const ishaPermissibleEnd = document.getElementById('isha-permissible-end');

    const fajrPreferredEnd = document.getElementById('fajr-preferred-end');
    const dhuhrPreferredEnd = document.getElementById('dhuhr-preferred-end');
    const asrPreferredEnd = document.getElementById('asr-preferred-end');
    const maghribPreferredEnd = document.getElementById('maghrib-preferred-end');
    const ishaPreferredEnd = document.getElementById('isha-preferred-end');

    const dislikedFajrRange = document.getElementById('disliked-fajr-range');
    const dislikedZawaalRange = document.getElementById('disliked-zawaal-range');
    const dislikedMaghribRange = document.getElementById('disliked-maghrib-range');

    const refreshButton = document.getElementById('refresh-button');
    const lastUpdatedDisplay = document.querySelector('.last-updated');

    // --- Constants and Configuration ---
    const CACHE_KEY = 'monthlyPrayerTimesAdhanCache'; // Unique key for adhan-js cache
    const REFRESH_THRESHOLD_DAYS = 7; // How old cached data can be before prompting refresh

    // Adhan-js Calculation Configuration (COMMON CHOICE - ISNA, Shafii for Asr)
    // You can adjust these based on preferred Madhab/Calculation Method
    const CALC_METHOD = adhan.CalculationMethod.NorthAmerica(); // For ISNA
    CALC_METHOD.madhab = adhan.Madhab.Shafi; // For Asr calculation (Shafii vs. Hanafi)
    // For specific settings, uncomment and adjust:
    // CALC_METHOD.adjustments.dhuhr = 0; // Adjust Dhuhr (minutes)
    // CALC_METHOD.adjustments.fajr = 0; // Adjust Fajr (minutes) etc.

    // --- Helper Functions ---

    // Formats a Date object to 12hr time (HH:MM AM/PM)
    function formatTime(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime())) return '--:--';
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedH = hours % 12 === 0 ? 12 : hours % 12;
        return `${formattedH}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    // Helper to add/subtract minutes to a Date object
    function addMinutes(date, minutes) {
        const newDate = new Date(date.getTime());
        newDate.setMinutes(date.getMinutes() + minutes);
        return newDate;
    }

    // Displays an error message
    function displayError(message) {
        const existingError = document.querySelector('.error-message');
        if (existingError) existingError.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.backgroundColor = '#f8d7da';
        errorDiv.style.color = '#721c24';
        errorDiv.style.border = '1px solid #f5c6cb';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.marginBottom = '20px';
        errorDiv.textContent = message;
        document.querySelector('.container').prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 7000);
    }

    // Saves data to localStorage
    function saveToCache(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`Data for ${key} saved to cache.`);
        } catch (e) {
            console.error(`Error saving ${key} to localStorage:`, e);
            displayError('Could not save data for offline use. Storage might be full.');
        }
    }

    // Loads data from localStorage
    function loadFromCache(key) {
        try {
            const cachedData = localStorage.getItem(key);
            return cachedData ? JSON.parse(cachedData) : null;
        } catch (e) {
            console.error(`Error loading ${key} from localStorage:`, e);
            return null;
        }
    }

    // --- Main Display Function ---
    // Takes calculated PrayerTimes objects for today and tomorrow
    function displayAllPrayerTimes(todaysAdhanTimes, tomorrowsAdhanTimes, isCached = false) {
        // --- Populate Main Prayer Times (Start Times) ---
        fajrTime.textContent = formatTime(todaysAdhanTimes.fajr);
        sunriseTime.textContent = formatTime(todaysAdhanTimes.sunrise);
        dhuhrTime.textContent = formatTime(todaysAdhanTimes.dhuhr);
        asrTime.textContent = formatTime(todaysAdhanTimes.asr);
        maghribTime.textContent = formatTime(todaysAdhanTimes.maghrib);
        ishaTime.textContent = formatTime(todaysAdhanTimes.isha);

        // --- Calculate and Populate Permissible End Times ---
        fajrPermissibleEnd.textContent = `Ends: ${formatTime(todaysAdhanTimes.sunrise)}`;
        dhuhrPermissibleEnd.textContent = `Ends: ${formatTime(todaysAdhanTimes.asr)}`;
        asrPermissibleEnd.textContent = `Ends: ${formatTime(todaysAdhanTimes.maghrib)}`;
        maghribPermissibleEnd.textContent = `Ends: ${formatTime(todaysAdhanTimes.isha)}`;
        ishaPermissibleEnd.textContent = `Ends: ${formatTime(tomorrowsAdhanTimes.fajr)}`; // Isha ends at next day's Fajr

        // --- Calculate and Populate Preferred Time Ends ---
        // Note: Preferred times are approximations based on common interpretations and adhan-js capabilities.
        // Fajr Preferred: Up to Sunrise (simplified for app clarity)
        fajrPreferredEnd.textContent = `Preferred: until ${formatTime(todaysAdhanTimes.sunrise)}`;

        // Dhuhr Preferred: Halfway between Dhuhr and Asr
        const dhuhrPreferredMidpoint = new Date(todaysAdhanTimes.dhuhr.getTime() + (todaysAdhanTimes.asr.getTime() - todaysAdhanTimes.dhuhr.getTime()) / 2);
        dhuhrPreferredEnd.textContent = `Preferred: until ${formatTime(dhuhrPreferredMidpoint)}`;

        // Asr Preferred: Roughly 45 minutes before Maghrib (approx. when sun begins to yellow)
        const asrPreferredEnd = addMinutes(todaysAdhanTimes.maghrib, -45);
        asrPreferredEnd.setSeconds(0,0); // Clear seconds/ms for cleaner display
        asrPreferredEnd.setMilliseconds(0);
        asrPreferredEnd.setMinutes(Math.floor(asrPreferredEnd.getMinutes() / 5) * 5); // Round down to nearest 5 mins
        asrPreferredEnd.setMinutes(asrPreferredEnd.getMinutes() + (asrPreferredEnd.getMinutes() % 5 > 2 ? 5 - asrPreferredEnd.getMinutes() % 5 : 0)); // Round up if more than 2 mins past a 5-min mark.
        asrPreferredEnd.setMinutes(asrPreferredEnd.getMinutes() - (asrPreferredEnd.getMinutes() % 5)); // ensure 5-min steps (e.g., 1:17 -> 1:15)

        asrPreferredEnd.textContent = `Preferred: until ${formatTime(asrPreferredEnd)}`;

        // Maghrib Preferred: Fixed 20 minutes after Maghrib (highly recommended to pray immediately)
        const maghribPreferredEnd = addMinutes(todaysAdhanTimes.maghrib, 20);
        maghribPreferredEnd.setSeconds(0,0); // Clear seconds/ms for cleaner display
        maghribPreferredEnd.setMilliseconds(0);
        maghribPreferredEnd.setMinutes(Math.floor(maghribPreferredEnd.getMinutes() / 5) * 5); // Round down to nearest 5 mins
        maghribPreferredEnd.setMinutes(maghribPreferredEnd.getMinutes() + (maghribPreferredEnd.getMinutes() % 5 > 2 ? 5 - maghribPreferredEnd.getMinutes() % 5 : 0)); // Round up if more than 2 mins past a 5-min mark.
        maghribPreferredEnd.setMinutes(maghribPreferredEnd.getMinutes() - (maghribPreferredEnd.getMinutes() % 5)); // ensure 5-min steps (e.g., 1:17 -> 1:15)
        maghribPreferredEnd.textContent = `Preferred: until ${formatTime(maghribPreferredEnd)}`;

        // Isha Preferred: Up to Midnight (halfway between Maghrib and next Fajr)
        ishaPreferredEnd.textContent = `Preferred: until ${formatTime(todaysAdhanTimes.midnight)}`;


        // --- Populate Disliked/Forbidden Times (for Nafl prayers) ---
        // 1. After Fajr (Sunrise to Ishraq)
        const ishraqStart = todaysAdhanTimes.sunrise;
        const ishraqEnd = addMinutes(ishraqStart, 15); // Approx. 10-15 minutes after sunrise
        dislikedFajrRange.textContent = `${formatTime(ishraqStart)} - ${formatTime(ishraqEnd)}`;

        // 2. At Zenith (Zawaal) - short window before Dhuhr
        const zawaalEnd = todaysAdhanTimes.dhuhr;
        const zawaalStart = addMinutes(zawaalEnd, -5); // Approx. 5 minutes before Dhuhr
        dislikedZawaalRange.textContent = `${formatTime(zawaalStart)} - ${formatTime(zawaalEnd)}`;

        // 3. Before Maghrib (Asr Karaha) - when sun begins to yellow
        const karahaMaghribEnd = todaysAdhanTimes.maghrib;
        const karahaMaghribStart = addMinutes(karahaMaghribEnd, -45); // Approx. 45 minutes before Maghrib
        dislikedMaghribRange.textContent = `${formatTime(karahaMaghribStart)} - ${formatTime(karahaMaghribEnd)}`;


        // --- Update Date and Last Updated Display ---
        dateDisplay.textContent = todaysAdhanTimes.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        if (isCached) {
            // Use cachedAt from stored data, or current time if missing (fallback)
            const fetchedAt = new Date(todaysAdhanTimes.cachedAt || Date.now());
            lastUpdatedDisplay.textContent = `(from cache, last fetched: ${fetchedAt.toLocaleDateString()} ${fetchedAt.toLocaleTimeString()})`;
        } else {
            lastUpdatedDisplay.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    // --- Adhan-js Calculation and Caching Logic ---
    async function calculateAndCachePrayerTimes(latitude, longitude, forceRefresh = false) {
        locationDisplay.textContent = `Location: Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
        lastUpdatedDisplay.textContent = forceRefresh ? 'Refreshing times...' : 'Calculating times...';

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();

        // Check cache first if not forcing refresh
        if (!forceRefresh) {
            const cachedMonthlyData = loadFromCache(CACHE_KEY);
            if (cachedMonthlyData &&
                cachedMonthlyData.month === currentMonth &&
                cachedMonthlyData.year === currentYear &&
                new Date(cachedMonthlyData.fetchedAt) > addMinutes(today, -REFRESH_THRESHOLD_DAYS * 24 * 60)) { // Check if fetched within refresh threshold
                console.log('Using cached adhan-js data...');
                const todayData = cachedMonthlyData.dailyTimes.find(d => new Date(d.date).getDate() === currentDay);
                // Important: For tomorrow's data, check if it exists in cache. If not (e.g., last day of month in cache), calculate it.
                const tomorrowDateObj = new Date(today);
                tomorrowDateObj.setDate(today.getDate() + 1);
                const tomorrowData = cachedMonthlyData.dailyTimes.find(d => new Date(d.date).getDate() === tomorrowDateObj.getDate() && (new Date(d.date).getMonth() + 1) === (tomorrowDateObj.getMonth() + 1));


                if (todayData) {
                    // Reconstruct adhan.PrayerTimes objects from plain objects in cache
                    const todaysAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(todayData.latitude, todayData.longitude), new Date(todayData.date), CALC_METHOD);
                    for (const key in todayData.times) {
                        if (todayData.times.hasOwnProperty(key)) {
                            todaysAdhanTimes[key] = new Date(todayData.times[key]); // Convert string back to Date
                        }
                    }
                    todaysAdhanTimes.cachedAt = todayData.cachedAt; // Keep the cachedAt timestamp

                    let tomorrowsAdhanTimes = null;
                    if (tomorrowData) {
                        tomorrowsAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(tomorrowData.latitude, tomorrowData.longitude), new Date(tomorrowData.date), CALC_METHOD);
                        for (const key in tomorrowData.times) {
                            if (tomorrowData.times.hasOwnProperty(key)) {
                                tomorrowsAdhanTimes[key] = new Date(tomorrowData.times[key]);
                            }
                        }
                    } else {
                        // If no tomorrow data in cache (e.g., end of month), calculate it
                        tomorrowsAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(latitude, longitude), tomorrowDateObj, CALC_METHOD);
                    }

                    displayAllPrayerTimes(todaysAdhanTimes, tomorrowsAdhanTimes, true);
                    return; // Displayed from cache, no need to proceed
                }
            }
        }

        // If no valid cache or force refresh, calculate and cache for the month
        console.log('Calculating new adhan-js data for the month...');
        const dailyTimes = [];
        const numDaysInMonth = new Date(currentYear, currentMonth, 0).getDate(); // Get number of days in month

        for (let day = 1; day <= numDaysInMonth; day++) {
            const date = new Date(currentYear, currentMonth - 1, day); // Month is 0-indexed for Date object
            const coordinates = new adhan.Coordinates(latitude, longitude);
            const prayerTimes = new adhan.PrayerTimes(coordinates, date, CALC_METHOD);

            // Store times as ISO strings for JSON serialization
            const timesAsStrings = {};
            // Loop through Adhan.js properties and convert Date objects to ISO strings
            ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight'].forEach(key => {
                if (prayerTimes[key] instanceof Date) {
                    timesAsStrings[key] = prayerTimes[key].toISOString();
                }
            });

            dailyTimes.push({
                date: date.toISOString(), // Store date as string
                latitude: latitude,
                longitude: longitude,
                times: timesAsStrings, // Store the serialized prayer times object
            });
        }

        const cacheDataToSave = {
            dailyTimes: dailyTimes,
            month: currentMonth,
            year: currentYear,
            latitude: latitude,
            longitude: longitude,
            fetchedAt: new Date().toISOString()
        };
        saveToCache(CACHE_KEY, cacheDataToSave);

        // Now, find today's and tomorrow's data from the newly calculated set
        const todayData = dailyTimes.find(d => new Date(d.date).getDate() === currentDay && (new Date(d.date).getMonth() + 1) === currentMonth);
        const tomorrowDateObj = new Date(today);
        tomorrowDateObj.setDate(today.getDate() + 1);
        const tomorrowData = dailyTimes.find(d => new Date(d.date).getDate() === tomorrowDateObj.getDate() && (new Date(d.date).getMonth() + 1) === (tomorrowDateObj.getMonth() + 1));

        if (todayData) {
             // Reconstruct adhan.PrayerTimes objects from plain objects for immediate display
            const todaysAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(todayData.latitude, todayData.longitude), new Date(todayData.date), CALC_METHOD);
            for (const key in todayData.times) {
                if (typeof todayData.times[key] === 'string' && !isNaN(new Date(todayData.times[key]))) {
                    todaysAdhanTimes[key] = new Date(todayData.times[key]);
                }
            }
            todaysAdhanTimes.cachedAt = cacheDataToSave.fetchedAt; // Link to the cache fetch time

            let tomorrowsAdhanTimes = null;
            if (tomorrowData) {
                tomorrowsAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(tomorrowData.latitude, tomorrowData.longitude), new Date(tomorrowData.date), CALC_METHOD);
                for (const key in tomorrowData.times) {
                    if (typeof tomorrowData.times[key] === 'string' && !isNaN(new Date(tomorrowData.times[key]))) {
                        tomorrowsAdhanTimes[key] = new Date(tomorrowData.times[key]);
                    }
                }
            } else {
                 // If tomorrow is next month and not in cache, calculate it directly
                tomorrowsAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(latitude, longitude), tomorrowDateObj, CALC_METHOD);
            }

            displayAllPrayerTimes(todaysAdhanTimes, tomorrowsAdhanTimes, false);
        } else {
            displayError('Could not calculate prayer times for today.');
        }
    }


    // --- Geolocation and Initialization ---
    function initPrayerTimes(forceRefresh = false) {
        if (navigator.geolocation) {
            locationDisplay.textContent = 'Getting your location...';
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    await calculateAndCachePrayerTimes(lat, lon, forceRefresh);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    let errorMessage = 'Could not get your location.';
                    if (error.code === error.PERMISSION_DENIED) {
                        errorMessage += ' Please enable location services and grant permission to this site.';
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        errorMessage += ' Location information is unavailable.';
                    } else if (error.code === error.TIMEOUT) {
                        errorMessage += ' The request to get user location timed out.';
                    }
                    displayError(errorMessage + ' Attempting to load from cache.');
                    locationDisplay.textContent = 'Location unavailable.';

                    // Try loading from cache if geolocation fails
                    const today = new Date();
                    const currentMonth = today.getMonth() + 1;
                    const currentYear = today.getFullYear();
                    const currentDay = today.getDate();

                    const cachedMonthlyData = loadFromCache(CACHE_KEY);
                    if (cachedMonthlyData &&
                        cachedMonthlyData.month === currentMonth &&
                        cachedMonthlyData.year === currentYear) { // Basic check for current month/year
                        const todayData = cachedMonthlyData.dailyTimes.find(d => new Date(d.date).getDate() === currentDay && (new Date(d.date).getMonth() + 1) === currentMonth);
                        const tomorrowDateObj = new Date(today);
                        tomorrowDateObj.setDate(today.getDate() + 1);
                        const tomorrowData = cachedMonthlyData.dailyTimes.find(d => new Date(d.date).getDate() === tomorrowDateObj.getDate() && (new Date(d.date).getMonth() + 1) === (tomorrowDateObj.getMonth() + 1));

                        if (todayData) {
                            const todaysAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(todayData.latitude, todayData.longitude), new Date(todayData.date), CALC_METHOD);
                            for (const key in todayData.times) {
                                if (typeof todayData.times[key] === 'string' && !isNaN(new Date(todayData.times[key]))) {
                                    todaysAdhanTimes[key] = new Date(todayData.times[key]);
                                }
                            }
                            todaysAdhanTimes.cachedAt = cachedMonthlyData.fetchedAt;

                            let tomorrowsAdhanTimes = null;
                            if (tomorrowData) {
                                tomorrowsAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(tomorrowData.latitude, tomorrowData.longitude), new Date(tomorrowData.date), CALC_METHOD);
                                for (const key in tomorrowData.times) {
                                    if (typeof tomorrowData.times[key] === 'string' && !isNaN(new Date(tomorrowData.times[key]))) {
                                        tomorrowsAdhanTimes[key] = new Date(tomorrowData.times[key]);
                                    }
                                }
                            } else {
                                // If tomorrow is next month and not in cache, calculate it directly (using cached coordinates)
                                tomorrowsAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(cachedMonthlyData.latitude, cachedMonthlyData.longitude), tomorrowDateObj, CALC_METHOD);
                            }
                            displayAllPrayerTimes(todaysAdhanTimes, tomorrowsAdhanTimes, true);
                        } else {
                            displayError('Cached data available, but no times for today found.');
                        }
                    } else {
                        displayError('No cached data and geolocation unavailable. Cannot run without internet.');
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        } else {
            displayError('Geolocation is not supported by your browser. Cannot fetch new data.');
            locationDisplay.textContent = 'Geolocation not supported.';
            // Load from cache if browser doesn't support geolocation
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            const currentDay = today.getDate();

            const cachedMonthlyData = loadFromCache(CACHE_KEY);
            if (cachedMonthlyData &&
                cachedMonthlyData.month === currentMonth &&
                cachedMonthlyData.year === currentYear) {
                const todayData = cachedMonthlyData.dailyTimes.find(d => new Date(d.date).getDate() === currentDay && (new Date(d.date).getMonth() + 1) === currentMonth);
                const tomorrowDateObj = new Date(today);
                tomorrowDateObj.setDate(today.getDate() + 1);
                const tomorrowData = cachedMonthlyData.dailyTimes.find(d => new Date(d.date).getDate() === tomorrowDateObj.getDate() && (new Date(d.date).getMonth() + 1) === (tomorrowDateObj.getMonth() + 1));

                if (todayData) {
                    const todaysAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(todayData.latitude, todayData.longitude), new Date(todayData.date), CALC_METHOD);
                    for (const key in todayData.times) {
                        if (typeof todayData.times[key] === 'string' && !isNaN(new Date(todayData.times[key]))) {
                            todaysAdhanTimes[key] = new Date(todayData.times[key]);
                        }
                    }
                    todaysAdhanTimes.cachedAt = cachedMonthlyData.fetchedAt;

                    let tomorrowsAdhanTimes = null;
                    if (tomorrowData) {
                        tomorrowsAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(tomorrowData.latitude, tomorrowData.longitude), new Date(tomorrowData.date), CALC_METHOD);
                        for (const key in tomorrowData.times) {
                            if (typeof tomorrowData.times[key] === 'string' && !isNaN(new Date(tomorrowData.times[key]))) {
                                tomorrowsAdhanTimes[key] = new Date(tomorrowData.times[key]);
                            }
                        }
                    } else {
                        tomorrowsAdhanTimes = new adhan.PrayerTimes(new adhan.Coordinates(cachedMonthlyData.latitude, cachedMonthlyData.longitude), tomorrowDateObj, CALC_METHOD);
                    }
                    displayAllPrayerTimes(todaysAdhanTimes, tomorrowsAdhanTimes, true);
                } else {
                    displayError('Cached data available, but no times for today found.');
                }
            } else {
                displayError('No cached data and geolocation not supported. Cannot run without internet.');
            }
        }
    }

    // Initial load
    initPrayerTimes();

    // Refresh button functionality
    refreshButton.addEventListener('click', () => {
        initPrayerTimes(true); // Force refresh
    });

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});