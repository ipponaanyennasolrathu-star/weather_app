/* =====================================================================
   Vasanth's Weather Dashboard — script.js
   Firebase path: /weather  →  humidity, is_dark, rain_percent, temperature
   ===================================================================== */

// ── Firebase refs ──────────────────────────────────────────────────────────
const db   = firebase.database();
const auth = firebase.auth();

// ── DOM refs ───────────────────────────────────────────────────────────────
const elTemp        = document.getElementById('currentTemp');
const elHum         = document.getElementById('currentHumidity');
const elRain        = document.getElementById('currentRain');
const elDarkStatus  = document.getElementById('darkStatus');
const elDarkIcon    = document.getElementById('darkIcon');
const elTempBar     = document.getElementById('tempBar');
const elHumBar      = document.getElementById('humBar');
const elRainBar     = document.getElementById('rainBar');
const elAlertBox    = document.getElementById('alertBox');
const elSafety      = document.getElementById('safetySuggestions');
const elCropGuide   = document.getElementById('cropGuide');
const elStatus      = document.getElementById('alertStatus');
const elStatusText  = elStatus.querySelector('.status-text');
const elLastUpdated = document.getElementById('lastUpdated');
const elConnDot     = document.getElementById('connDot');
const elConnText    = document.getElementById('connText');
const elLocation    = document.getElementById('currentLocation');
const elUserId      = document.getElementById('userIdDisplay');

// ── Location ───────────────────────────────────────────────────────────────
let savedLocation = localStorage.getItem('weatherLocation') || 'Vengavasal, Tamil Nadu';
elLocation.textContent = savedLocation;

// ── Theme picker ───────────────────────────────────────────────────────────
const colorInput = document.getElementById('themeColor');
colorInput.value  = localStorage.getItem('themeColor') || '#16a34a';
applyTheme(colorInput.value);
colorInput.addEventListener('input', e => {
    applyTheme(e.target.value);
    localStorage.setItem('themeColor', e.target.value);
});

function applyTheme(hex) {
    const r = document.documentElement;
    r.style.setProperty('--primary', hex);
    r.style.setProperty('--primary-light', hex + '22');
}

// ── Auth (anonymous) ───────────────────────────────────────────────────────
auth.signInAnonymously().then(cred => {
    elUserId.textContent = cred.user.uid;
    listenToSensor();
}).catch(err => {
    // fallback: listen without auth
    elUserId.textContent = 'guest';
    listenToSensor();
});

// ── Firebase listener ──────────────────────────────────────────────────────
let lastData = null;

function listenToSensor() {
    setConnecting();
    const ref = db.ref('weather');          // ← your Firebase path

    ref.on('value', snap => {
        const data = snap.val();
        if (!data) {
            setConnError('No data at /weather');
            return;
        }
        setConnected();
        lastData = data;
        renderDashboard(data);
    }, err => {
        setConnError(err.message);
    });
}

// ── Render all panels ──────────────────────────────────────────────────────
function renderDashboard(d) {
    const temp = parseFloat(d.temperature) || 0;
    const hum  = parseFloat(d.humidity)    || 0;
    const rain = parseFloat(d.rain_percent)|| 0;
    const dark = d.is_dark === true || d.is_dark === 'true';

    // Metrics
    elTemp.textContent = temp.toFixed(1) + '°C';
    elHum.textContent  = hum.toFixed(1)  + '%';
    elRain.textContent = rain.toFixed(0) + '%';

    elDarkStatus.textContent = dark ? 'Night'  : 'Day';
    elDarkIcon.textContent   = dark ? '🌙'     : '☀️';

    // Bars (temp: 0–50, hum/rain: 0–100)
    elTempBar.style.width = Math.min(100, (temp / 50) * 100) + '%';
    elHumBar.style.width  = Math.min(100, hum)  + '%';
    elRainBar.style.width = Math.min(100, rain) + '%';

    // Timestamp
    elLastUpdated.textContent = new Date().toLocaleTimeString('en-IN');

    // Alerts + safety
    renderAlerts(temp, hum, rain, dark);
    renderSafety(temp, hum, rain, dark);
    renderCropGuide(temp, hum, rain);
}

// ── Alerts panel ───────────────────────────────────────────────────────────
function renderAlerts(temp, hum, rain, dark) {
    const alerts = [];

    if (temp >= 40)       alerts.push({ cls: 'danger',  msg: '🔥 Extreme Heat! Temperature above 40 °C — stay hydrated.' });
    else if (temp >= 35)  alerts.push({ cls: 'warning', msg: '☀️ High Temperature: ' + temp.toFixed(1) + ' °C — limit outdoor exposure.' });
    else if (temp <= 10)  alerts.push({ cls: 'info',    msg: '🧊 Cold Alert: Temperature is ' + temp.toFixed(1) + ' °C — dress warmly.' });

    if (hum >= 85)        alerts.push({ cls: 'warning', msg: '💦 Very High Humidity (' + hum.toFixed(0) + '%) — risk of mold & discomfort.' });
    else if (hum <= 25)   alerts.push({ cls: 'info',    msg: '🌵 Low Humidity (' + hum.toFixed(0) + '%) — keep plants & skin moisturised.' });

    if (rain >= 70)       alerts.push({ cls: 'danger',  msg: '🌧️ Heavy Rain Likely (' + rain.toFixed(0) + '%) — avoid outdoor work.' });
    else if (rain >= 40)  alerts.push({ cls: 'warning', msg: '🌦️ Moderate Rain (' + rain.toFixed(0) + '%) — carry an umbrella.' });

    if (dark)             alerts.push({ cls: 'info',    msg: '🌙 Night-time — ensure field lights are operational.' });

    if (!alerts.length)   alerts.push({ cls: 'safe',    msg: '✅ All conditions normal. No immediate hazards detected.' });

    // Overall status
    const hasDanger  = alerts.some(a => a.cls === 'danger');
    const hasWarning = alerts.some(a => a.cls === 'warning');
    elStatus.className = 'status-circle ' + (hasDanger ? 'danger' : hasWarning ? 'warning' : 'safe');
    elStatusText.textContent = hasDanger ? 'DANGER' : hasWarning ? 'CAUTION' : 'SAFE';

    elAlertBox.innerHTML = alerts.map(a =>
        `<div class="alert-item alert-${a.cls}">${a.msg}</div>`
    ).join('');
}

// ── Safety guidance panel ──────────────────────────────────────────────────
function renderSafety(temp, hum, rain, dark) {
    const tips = [];

    // Temperature tips
    if (temp >= 38) {
        tips.push('Avoid working in open fields between 11 AM and 4 PM.');
        tips.push('Keep ORS (oral rehydration salts) handy for workers.');
    } else if (temp >= 32) {
        tips.push('Wear light-coloured, loose clothing outdoors.');
        tips.push('Irrigate early morning or evening to reduce water loss.');
    } else if (temp <= 12) {
        tips.push('Protect sensitive crops with mulching or cover sheets overnight.');
        tips.push('Wear layered clothing; hypothermia risk in prolonged cold.');
    }

    // Humidity tips
    if (hum >= 85) {
        tips.push('High humidity — watch for fungal disease on crops; apply fungicide if needed.');
        tips.push('Ensure good air circulation in storage rooms.');
    } else if (hum <= 30) {
        tips.push('Low humidity — increase irrigation frequency for vegetable crops.');
        tips.push('Mulch around plant bases to retain soil moisture.');
    }

    // Rain tips
    if (rain >= 60) {
        tips.push('Delay fertiliser or pesticide application — runoff will reduce effectiveness.');
        tips.push('Check drainage channels and clear blockages to prevent waterlogging.');
    } else if (rain >= 30) {
        tips.push('Monitor soil moisture before irrigation — rainfall may suffice today.');
    } else {
        tips.push('Dry conditions — schedule irrigation for evening to minimise evaporation.');
    }

    // Night tips
    if (dark) {
        tips.push('Avoid operating heavy machinery at night without adequate lighting.');
        tips.push('Secure livestock and check fencing before nightfall.');
    }

    // Generic always-on
    tips.push('Check local weather forecast before large-scale field operations.');

    elSafety.innerHTML = tips.map(t =>
        `<li class="suggestion-item"><span class="bullet"></span>${t}</li>`
    ).join('');
}

// ── Farmer Crop Guide ──────────────────────────────────────────────────────
const cropDatabase = [
    // Hot & dry
    { name: 'Pearl Millet (Bajra)', emoji: '🌾', minTemp: 25, maxTemp: 45, minHum: 20, maxHum: 55, maxRain: 40,
      why: 'Thrives in hot, dry climates with low humidity.',
      tip: 'Sow after first rain; thin to 15 cm spacing for best yield.' },
    { name: 'Sorghum (Jowar)', emoji: '🌿', minTemp: 25, maxTemp: 40, minHum: 25, maxHum: 60, maxRain: 50,
      why: 'Drought-tolerant; excellent for high-temperature periods.',
      tip: 'Needs well-drained soil; avoid waterlogging.' },
    { name: 'Sesame', emoji: '🫘', minTemp: 25, maxTemp: 42, minHum: 20, maxHum: 50, maxRain: 35,
      why: 'Perfect for hot & dry conditions; minimal water needs.',
      tip: 'Harvest before pods shatter; watch for stem rot in wet spells.' },

    // Warm & moderate
    { name: 'Tomato', emoji: '🍅', minTemp: 18, maxTemp: 32, minHum: 50, maxHum: 75, maxRain: 60,
      why: 'Ideal in warm conditions with moderate humidity.',
      tip: 'Stake plants early; apply potassium fertiliser at fruit set.' },
    { name: 'Brinjal (Eggplant)', emoji: '🍆', minTemp: 20, maxTemp: 35, minHum: 45, maxHum: 75, maxRain: 55,
      why: 'Warm-season crop; performs well in current conditions.',
      tip: 'Mulch to retain moisture; watch for shoot & fruit borer.' },
    { name: 'Groundnut (Peanut)', emoji: '🥜', minTemp: 22, maxTemp: 36, minHum: 45, maxHum: 70, maxRain: 55,
      why: 'Warm-weather legume that fixes nitrogen into soil.',
      tip: 'Harvest when leaves yellow; dry pods immediately after.' },
    { name: 'Okra (Ladies Finger)', emoji: '🫛', minTemp: 22, maxTemp: 38, minHum: 40, maxHum: 80, maxRain: 65,
      why: 'Fast-growing warm crop; tolerates humidity well.',
      tip: 'Harvest every 2 days to keep plants productive.' },

    // High humidity / rainy
    { name: 'Paddy (Rice)', emoji: '🌾', minTemp: 20, maxTemp: 38, minHum: 65, maxHum: 100, maxRain: 100,
      why: 'Thrives in high humidity and wet conditions.',
      tip: 'Maintain 5 cm standing water; apply nitrogen at tillering.' },
    { name: 'Sugarcane', emoji: '🎋', minTemp: 20, maxTemp: 38, minHum: 60, maxHum: 95, maxRain: 80,
      why: 'High water demand; current rains reduce irrigation cost.',
      tip: 'Inter-crop with legumes in early months to boost soil health.' },
    { name: 'Banana', emoji: '🍌', minTemp: 20, maxTemp: 35, minHum: 65, maxHum: 95, maxRain: 75,
      why: 'Loves humidity and warmth; thrives in South Indian climate.',
      tip: 'Prop the pseudostem as bunch develops; remove dry leaves.' },
    { name: 'Tapioca (Cassava)', emoji: '🪴', minTemp: 22, maxTemp: 38, minHum: 60, maxHum: 90, maxRain: 80,
      why: 'Tolerates wet, warm conditions and modest soil quality.',
      tip: 'Plant cuttings at 45° angle; harvest at 9–12 months.' },
    { name: 'Taro (Colocasia)', emoji: '🥔', minTemp: 18, maxTemp: 35, minHum: 65, maxHum: 95, maxRain: 85,
      why: 'Semi-aquatic crop; ideal for humid, rainy periods.',
      tip: 'Plant in shaded areas; mulch heavily to maintain moisture.' },

    // Mild / cool
    { name: 'Cabbage', emoji: '🥬', minTemp: 10, maxTemp: 26, minHum: 50, maxHum: 80, maxRain: 60,
      why: 'Cool-weather brassica; avoid in extreme heat.',
      tip: 'Transplant seedlings at 4–6 true leaves; net against pests.' },
    { name: 'Carrot', emoji: '🥕', minTemp: 8, maxTemp: 25, minHum: 45, maxHum: 75, maxRain: 55,
      why: 'Root crop that performs best in cooler temperatures.',
      tip: 'Loosen soil 30 cm deep before sowing; thin to 5 cm apart.' },
    { name: 'Onion', emoji: '🧅', minTemp: 12, maxTemp: 28, minHum: 40, maxHum: 70, maxRain: 45,
      why: 'Prefers mild, dry conditions with moderate humidity.',
      tip: 'Reduce irrigation 2 weeks before harvest for better storage.' },
    { name: 'Potato', emoji: '🥔', minTemp: 10, maxTemp: 24, minHum: 50, maxHum: 80, maxRain: 55,
      why: 'Tuber crop ideal in cooler spells; avoid water stress.',
      tip: 'Earth-up to prevent greening; harvest when vines die back.' },
];

function renderCropGuide(temp, hum, rain) {
    const matches = cropDatabase.filter(c =>
        temp >= c.minTemp && temp <= c.maxTemp &&
        hum  >= c.minHum  && hum  <= c.maxHum  &&
        rain <= c.maxRain
    );

    if (!matches.length) {
        elCropGuide.innerHTML = '<p class="placeholder-text">⚠️ Conditions are extreme — consult your local agricultural extension officer.</p>';
        return;
    }

    elCropGuide.innerHTML = matches.map(c => `
        <div class="crop-item">
            <div class="crop-emoji">${c.emoji}</div>
            <div class="crop-body">
                <div class="crop-name">${c.name}</div>
                <div class="crop-why">${c.why}</div>
                <div class="crop-tip">💡 ${c.tip}</div>
            </div>
        </div>
    `).join('');
}

// ── Manual refresh ─────────────────────────────────────────────────────────
function manualRefresh() {
    if (lastData) renderDashboard(lastData);
}

// ── Location modal ─────────────────────────────────────────────────────────
function promptForLocation() {
    document.getElementById('locationModal').classList.remove('hidden');
}
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('locationModal').classList.add('hidden');
});
document.getElementById('saveLocation').addEventListener('click', () => {
    const val = document.getElementById('manualLocationInput').value.trim();
    if (val) {
        savedLocation = val;
        localStorage.setItem('weatherLocation', val);
        elLocation.textContent = val;
    }
    document.getElementById('locationModal').classList.add('hidden');
});
document.getElementById('useGeoLocation').addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Geolocation not supported.');
    navigator.geolocation.getCurrentPosition(pos => {
        const loc = `${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`;
        savedLocation = loc;
        localStorage.setItem('weatherLocation', loc);
        elLocation.textContent = loc;
        document.getElementById('locationModal').classList.add('hidden');
    }, () => alert('GPS permission denied.'));
});

// ── Connection helpers ─────────────────────────────────────────────────────
function setConnecting() {
    elConnDot.style.background  = '#f59e0b';
    elConnText.textContent      = 'Connecting to Firebase…';
}
function setConnected() {
    elConnDot.style.background  = '#22c55e';
    elConnText.textContent      = 'Live — ESP32 data streaming';
}
function setConnError(msg) {
    elConnDot.style.background  = '#ef4444';
    elConnText.textContent      = 'Error: ' + msg;
    elAlertBox.innerHTML        = `<div class="alert-item alert-danger">🔴 Firebase connection failed: ${msg}</div>`;
}
