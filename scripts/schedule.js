// ---- Config ----
const SCHEDULE_FILE = 'data/schedule.csv';

// Opponent name -> logo filename in /assets.
// Add a new line here the first time you play a brand new opponent;
// every future game against them just needs the name typed in the CSV.
const LOGO_MAP = {
    "TRF": "trf.png",
    "EGF": "egf.png",
    "Warroad": "warroad.png",
    "SH": "sacredheart.png",
    "KCC": "kcc.png",
    "SAC": "stephen.png",
    "Menagha": "menagha.png",
    "WDC": "wadena.png",
    "Clearbrook": "clearbrook.png",
    "GGG": "grygla.png",
    "BGMR": "badger.png",
    "WAO": "warren.png",
    "Crookston": "crookston.png",
    "Freeze": "freeze.png",
    "IFalls": "ifalls.png",
    "RLC": "rlcc.png",
    "LOTW": "lotw.png",
    "Roseau": "roseau.png",
    "Grafton": "grafton.png",
};
const ROSEAU_LOGO = "roseau.png";
const FALLBACK_LOGO = "roseau.png"; // used if an opponent isn't in the map yet

let allGames = [];
let viewTeam = 'varsity'; // 'varsity' | 'jh'

const statusEl = document.getElementById('schedule-status');
const listEl = document.getElementById('game-list');
const recordEl = document.getElementById('record-line');
const toggleEl = document.getElementById('sched-toggle');
const varsityLabel = document.getElementById('sched-varsity-label');
const jhLabel = document.getElementById('sched-jh-label');

// Minimal CSV parser -- fine for our simple, comma-only, no-embedded-comma data.
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const cells = line.split(',');
        const row = {};
        headers.forEach((h, i) => row[h] = (cells[i] || '').trim());
        return row;
    });
}

function loadSchedule() {
    fetch(SCHEDULE_FILE)
        .then(res => {
            if (!res.ok) throw new Error('Could not load schedule file');
            return res.text();
        })
        .then(text => {
            allGames = parseCSV(text);
            if (allGames.length === 0) {
                statusEl.textContent = 'No games scheduled yet.';
                return;
            }
            statusEl.style.display = 'none';
            render();
        })
        .catch(err => {
            console.error(err);
            statusEl.textContent = 'Schedule is temporarily unavailable. Please check back later.';
        });
}

function logoFor(opponent) {
    return 'assets/' + (LOGO_MAP[opponent] || FALLBACK_LOGO);
}

function render() {
    const games = allGames.filter(g => g.team === viewTeam);

    // Record only counts games with a recorded result.
    let wins = 0, losses = 0;
    games.forEach(g => {
        if (g.result === 'W') wins++;
        if (g.result === 'L') losses++;
    });
    recordEl.innerHTML = `Record: <span class="record-number">${wins}-${losses}</span>`;

    listEl.innerHTML = '';
    games.forEach(g => {
        const row = document.createElement('div');
        row.className = 'game-row' + (g.result === 'W' ? ' win' : g.result === 'L' ? ' loss' : '');

        const homeAway = g.location === 'home' ? 'vs' : '@';
        const leftLogo = g.location === 'home' ? ROSEAU_LOGO : logoFor(g.opponent).replace('assets/', '');
        const rightLogo = g.location === 'home' ? logoFor(g.opponent).replace('assets/', '') : ROSEAU_LOGO;

        let scoreHtml = '';
        if (g.result && g.score) {
            const cls = g.result === 'W' ? 'result-w' : 'result-l';
            scoreHtml = `<span class="${cls}">${g.result}</span> ${g.score}`;
        } else if (g.result) {
            const cls = g.result === 'W' ? 'result-w' : 'result-l';
            scoreHtml = `<span class="${cls}">${g.result}</span>`;
        } else {
            scoreHtml = homeAway === 'vs' ? 'Home' : 'Away';
        }

        row.innerHTML = `
            <div class="game-date">${g.date}</div>
            <div class="game-matchup">
                <img src="assets/${leftLogo}" alt="">
                <div class="game-meta">
                    <span class="game-loc">${homeAway}</span>
                    <span class="game-opponent">${g.opponent}</span>
                    <span class="game-score">${scoreHtml}</span>
                </div>
                <img src="assets/${rightLogo}" alt="">
            </div>
            <div class="game-time">${g.time}</div>
        `;
        listEl.appendChild(row);
    });
}

toggleEl.addEventListener('change', () => {
    viewTeam = toggleEl.checked ? 'jh' : 'varsity';
    varsityLabel.classList.toggle('active-label', viewTeam === 'varsity');
    jhLabel.classList.toggle('active-label', viewTeam === 'jh');
    render();
});

loadSchedule();
