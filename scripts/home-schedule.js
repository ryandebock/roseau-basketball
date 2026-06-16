// ---- Config ----
const SCHEDULE_FILE = 'data/schedule.csv';

const MONTH_MAP = {
    Nov: 10, Dec: 11, Jan: 0, Feb: 1, Mar: 2 // 0-indexed for JS Date
};

// Logo map shared in spirit with schedule.js -- duplicated here so this
// page has no dependency on that file. Keep both in sync if a new
// opponent is added.
const LOGO_MAP = {
    "TRF": "trf.png", "EGF": "egf.png", "Warroad": "warroad.png",
    "SH": "sacredheart.png", "KCC": "kcc.png", "SAC": "stephen.png",
    "Menagha": "menagha.png", "WDC": "wadena.png", "Clearbrook": "clearbrook.png",
    "GGG": "grygla.png", "BGMR": "badger.png", "WAO": "warren.png",
    "Crookston": "crookston.png", "Freeze": "freeze.png", "IFalls": "ifalls.png",
    "RLC": "rlcc.png", "LOTW": "lotw.png", "Roseau": "roseau.png", "Grafton": "grafton.png",
};
const ROSEAU_LOGO = "roseau.png";
const FALLBACK_LOGO = "roseau.png";

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

// Converts "Dec. 1st" -> a real Date object, inferring the year from
// today's date using the same Nov 1 - Oct 31 season-year logic used
// elsewhere on the site (see roster grad_year filtering).
function parseGameDate(dateStr) {
    const match = dateStr.match(/^([A-Za-z]{3})\.?\s*(\d{1,2})/);
    if (!match) return null;
    const month = MONTH_MAP[match[1]];
    const day = parseInt(match[2], 10);
    if (month === undefined || isNaN(day)) return null;

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // Season runs Nov (10) through Mar (2). Nov/Dec belong to the
    // calendar year the season started in; Jan/Feb/Mar belong to the
    // following calendar year.
    let seasonStartYear;
    if (todayMonth >= 10) {
        seasonStartYear = todayYear;
    } else if (todayMonth <= 9) {
        // Before November -- if we're early in the year (Jan-Oct),
        // we're still inside the season that started last fall.
        seasonStartYear = todayMonth <= 2 ? todayYear - 1 : todayYear;
    }

    const gameYear = (month >= 10) ? seasonStartYear : seasonStartYear + 1;
    return new Date(gameYear, month, day);
}

function logoFor(opponent) {
    return 'assets/' + (LOGO_MAP[opponent] || FALLBACK_LOGO);
}

function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // back up to Sunday
    return d;
}

function endOfWeek(date) {
    const d = startOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

function renderTeamTable(games, team, tbodyId, captionId) {
    const tbody = document.getElementById(tbodyId);
    const caption = document.getElementById(captionId);
    tbody.innerHTML = '';

    const teamGames = games.filter(g => g.team === team);

    if (teamGames.length === 0) {
        caption.textContent = team === 'varsity' ? 'No Varsity Games This Week' : 'No JH Games This Week';
        return;
    }

    caption.textContent = team === 'varsity' ? 'Varsity This Week' : 'JH This Week';

    teamGames.forEach(g => {
        const tr = document.createElement('tr');
        const homeAway = g.location === 'home' ? 'vs' : '@';
        const leftLogo = g.location === 'home' ? ROSEAU_LOGO : logoFor(g.opponent).replace('assets/', '');
        const rightLogo = g.location === 'home' ? logoFor(g.opponent).replace('assets/', '') : ROSEAU_LOGO;

        tr.innerHTML = `
            <td class="sched-text">${g.date}</td>
            <td class="logo"><img src="assets/${leftLogo}" alt=""></td>
            <td class="sched-text">${homeAway}</td>
            <td class="logo"><img src="assets/${rightLogo}" alt=""></td>
            <td class="sched-text">${g.time}</td>
        `;
        tbody.appendChild(tr);
    });
}

function loadHomeSchedule() {
    fetch(SCHEDULE_FILE)
        .then(res => {
            if (!res.ok) throw new Error('Could not load schedule file');
            return res.text();
        })
        .then(text => {
            const allGames = parseCSV(text);
            const today = new Date();
            const weekStart = startOfWeek(today);
            const weekEnd = endOfWeek(today);

            const thisWeek = allGames
                .map(g => ({ ...g, _date: parseGameDate(g.date) }))
                .filter(g => g._date && g._date >= weekStart && g._date <= weekEnd)
                .sort((a, b) => a._date - b._date);

            renderTeamTable(thisWeek, 'varsity', 'varsity-body', 'varsity-caption');
            renderTeamTable(thisWeek, 'jh', 'jh-body', 'jh-caption');
        })
        .catch(err => {
            console.error(err);
            const vCap = document.getElementById('varsity-caption');
            const jCap = document.getElementById('jh-caption');
            if (vCap) vCap.textContent = 'Schedule unavailable';
            if (jCap) jCap.textContent = 'Schedule unavailable';
        });
}

loadHomeSchedule();
