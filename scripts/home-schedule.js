// ---- Config ----
const SCHEDULE_FILE = 'data/schedule.csv';
const PRACTICES_FILE = 'data/practices.csv';

const MONTH_MAP = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
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

// Converts "Dec. 1st" -> a real Date object. The CSV stores no year, so
// the year is inferred from a fixed season boundary: the season year
// runs Nov 1 - Oct 31, and flips forward on Nov 1 each year (e.g. the
// 2025-26 season covers Nov 1 2025 - Oct 31 2026; the 2026-27 season
// starts Nov 1 2026). Nov/Dec dates belong to the season's start year;
// every other month (Jan-Oct) belongs to the following calendar year.
// This matches the same Nov 1 cutoff used for roster grad_year filtering.
function parseGameDate(dateStr) {
    const match = dateStr.match(/^([A-Za-z]{3})\.?\s*(\d{1,2})/);
    if (!match) return null;
    const month = MONTH_MAP[match[1]];
    const day = parseInt(match[2], 10);
    if (month === undefined || isNaN(day)) return null;

    const today = new Date();
    const todayMonth = today.getMonth(); // 0-indexed, Nov = 10
    const todayYear = today.getFullYear();

    // If today is Nov or Dec, the current season started this calendar
    // year. Otherwise (Jan-Oct) the current season started last year.
    const seasonStartYear = todayMonth >= 10 ? todayYear : todayYear - 1;

    // Nov/Dec dates belong to the season's start year; Jan-Oct dates
    // belong to the year after.
    const gameYear = month >= 10 ? seasonStartYear : seasonStartYear + 1;
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

function renderTeamTable(items, team, tbodyId, captionId) {
    const tbody = document.getElementById(tbodyId);
    const caption = document.getElementById(captionId);
    tbody.innerHTML = '';

    const teamItems = items.filter(i => i.team === team);

    if (teamItems.length === 0) {
        caption.textContent = team === 'varsity' ? 'No Varsity Activities This Week' : 'No JH Activities This Week';
        return;
    }

    caption.textContent = team === 'varsity' ? 'Varsity This Week' : 'JH This Week';

    teamItems.forEach(item => {
        const tr = document.createElement('tr');

        if (item.kind === 'practice') {
            tr.classList.add('practice-row');
            tr.innerHTML = `
                <td class="sched-text">${item.date}</td>
                <td class="practice-label" colspan="3">Practice &mdash; ${item.location}</td>
                <td class="sched-text">${item.time}</td>
            `;
        } else {
            const homeAway = item.location === 'home' ? 'vs' : '@';
            const leftLogo = item.location === 'home' ? ROSEAU_LOGO : logoFor(item.opponent).replace('assets/', '');
            const rightLogo = item.location === 'home' ? logoFor(item.opponent).replace('assets/', '') : ROSEAU_LOGO;

            tr.innerHTML = `
                <td class="sched-text">${item.date}</td>
                <td class="logo"><img src="assets/${leftLogo}" alt=""></td>
                <td class="sched-text">${homeAway}</td>
                <td class="logo"><img src="assets/${rightLogo}" alt=""></td>
                <td class="sched-text">${item.time}</td>
            `;
        }
        tbody.appendChild(tr);
    });
}

function loadHomeSchedule() {
    Promise.all([
        fetch(SCHEDULE_FILE).then(res => {
            if (!res.ok) throw new Error('Could not load schedule file');
            return res.text();
        }),
        fetch(PRACTICES_FILE).then(res => {
            // Practices file is optional-ish; if it's missing or empty,
            // just treat it as no practices rather than failing the page.
            if (!res.ok) return '';
            return res.text();
        }).catch(() => ''),
    ])
        .then(([scheduleText, practicesText]) => {
            const today = new Date();
            const weekStart = startOfWeek(today);
            const weekEnd = endOfWeek(today);

            const games = parseCSV(scheduleText).map(g => ({ ...g, kind: 'game', _date: parseGameDate(g.date) }));
            const practices = practicesText.trim()
                ? parseCSV(practicesText).map(p => ({ ...p, kind: 'practice', _date: parseGameDate(p.date) }))
                : [];

            const thisWeek = [...games, ...practices]
                .filter(item => item._date && item._date >= weekStart && item._date <= weekEnd)
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
