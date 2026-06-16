// ---- Config ----
const STATS_FILE = 'data/stats.xlsx';
const SHEET_NAME = 'Sheet1';

// Season strings are formatted 'yyyy-yy' (e.g. "2025-26").
// "Current season" is auto-detected as the most recent season string
// present in the data -- no hardcoding required, no roster sheet needed.
// This also doubles as our "current roster" filter: a player only shows
// up in the Current Season view if they have rows in that season.

let allRows = [];
let currentSeason = null;
let viewMode = 'current'; // 'current' | 'career'
let sortKey = 'ppg';
let sortDir = 'desc';

const statusEl = document.getElementById('stats-status');
const tableEl = document.getElementById('stats-table');
const bodyEl = document.getElementById('stats-body');
const captionEl = document.getElementById('stats-caption');
const toggleEl = document.getElementById('stats-toggle');
const currentLabel = document.getElementById('stats-current-label');
const careerLabel = document.getElementById('stats-career-label');

function detectCurrentSeason(rows) {
    const seasons = [...new Set(rows.map(r => r.season).filter(Boolean))];
    // 'yyyy-yy' strings sort correctly as plain strings since the year prefix
    // is consistent width, so a simple sort gives us the most recent last.
    seasons.sort();
    return seasons[seasons.length - 1];
}

function loadStats() {
    fetch(STATS_FILE)
        .then(res => {
            if (!res.ok) throw new Error('Could not load stats file');
            return res.arrayBuffer();
        })
        .then(buffer => {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[SHEET_NAME] || workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: 0 });

            allRows = json.map(r => ({
                player: String(r.player || '').trim(),
                season: String(r.season || '').trim(),
                opponent: r.opponent,
                points: Number(r.points) || 0,
                fgm: Number(r.fgm) || 0,
                fga: Number(r.fga) || 0,
                fg3m: Number(r['3fgm']) || 0,
                fg3a: Number(r['3fga']) || 0,
                ftm: Number(r.ftm) || 0,
                fta: Number(r.fta) || 0,
                oreb: Number(r.oreb) || 0,
                dreb: Number(r.dreb) || 0,
                reb: Number(r.reb) || 0,
                ast: Number(r.ast) || 0,
                to: Number(r.to) || 0,
                stl: Number(r.stl) || 0,
                blk: Number(r.blk) || 0,
                foul: Number(r.foul) || 0,
            })).filter(r => r.player && r.season);

            if (allRows.length === 0) {
                statusEl.textContent = 'No stats found yet. Check back after the next game.';
                return;
            }

            currentSeason = detectCurrentSeason(allRows);
            statusEl.style.display = 'none';
            tableEl.style.display = 'table';
            render();
        })
        .catch(err => {
            console.error(err);
            statusEl.textContent = 'Stats are temporarily unavailable. Please check back later.';
        });
}

function aggregate(rows) {
    const byPlayer = new Map();

    rows.forEach(r => {
        if (!byPlayer.has(r.player)) {
            byPlayer.set(r.player, {
                player: r.player,
                gp: 0,
                points: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
                oreb: 0, dreb: 0, reb: 0, ast: 0, to: 0, stl: 0, blk: 0, foul: 0,
            });
        }
        const p = byPlayer.get(r.player);
        p.gp += 1;
        p.points += r.points;
        p.fgm += r.fgm;
        p.fga += r.fga;
        p.fg3m += r.fg3m;
        p.fg3a += r.fg3a;
        p.ftm += r.ftm;
        p.fta += r.fta;
        p.oreb += r.oreb;
        p.dreb += r.dreb;
        p.reb += r.reb;
        p.ast += r.ast;
        p.to += r.to;
        p.stl += r.stl;
        p.blk += r.blk;
        p.foul += r.foul;
    });

    return [...byPlayer.values()].map(p => ({
        ...p,
        ppg: p.gp ? p.points / p.gp : 0,
        rpg: p.gp ? p.reb / p.gp : 0,
        apg: p.gp ? p.ast / p.gp : 0,
        spg: p.gp ? p.stl / p.gp : 0,
        bpg: p.gp ? p.blk / p.gp : 0,
        topg: p.gp ? p.to / p.gp : 0,
        fg_pct: p.fga ? (p.fgm / p.fga) * 100 : 0,
        fg3_pct: p.fg3a ? (p.fg3m / p.fg3a) * 100 : 0,
        ft_pct: p.fta ? (p.ftm / p.fta) * 100 : 0,
    }));
}

function getRowsForView() {
    if (viewMode === 'current') {
        return allRows.filter(r => r.season === currentSeason);
    }
    // Career: include every season, but only for players who appear
    // in the current season (i.e. current roster), so graduated
    // players don't linger once they're gone.
    const currentRosterNames = new Set(
        allRows.filter(r => r.season === currentSeason).map(r => r.player)
    );
    return allRows.filter(r => currentRosterNames.has(r.player));
}

function formatStat(key, value) {
    if (['fg_pct', 'fg3_pct', 'ft_pct'].includes(key)) {
        return value.toFixed(1) + '%';
    }
    if (['ppg', 'rpg', 'apg', 'spg', 'bpg', 'topg'].includes(key)) {
        return value.toFixed(1);
    }
    return value;
}

function render() {
    const rows = getRowsForView();
    const aggregated = aggregate(rows);

    aggregated.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        let cmp;
        if (typeof av === 'string') {
            cmp = av.localeCompare(bv);
        } else {
            cmp = av - bv;
        }
        return sortDir === 'desc' ? -cmp : cmp;
    });

    captionEl.textContent = viewMode === 'current'
        ? `${currentSeason} Season`
        : 'Career Stats (Current Roster)';

    bodyEl.innerHTML = '';
    aggregated.forEach(p => {
        const tr = document.createElement('tr');
        const cells = [
            { key: 'player', cls: 'player-cell' },
            { key: 'gp' }, { key: 'ppg' }, { key: 'rpg' }, { key: 'apg' },
            { key: 'spg' }, { key: 'bpg' },
            { key: 'fg_pct' }, { key: 'fg3_pct' }, { key: 'ft_pct' },
            { key: 'points' }, { key: 'reb' }, { key: 'ast' },
            { key: 'stl' }, { key: 'blk' }
        ];
        cells.forEach(c => {
            const td = document.createElement('td');
            if (c.cls) td.className = c.cls;
            td.textContent = c.key === 'player' ? p.player : formatStat(c.key, p[c.key]);
            tr.appendChild(td);
        });
        bodyEl.appendChild(tr);
    });

    document.querySelectorAll('#stats-table thead th').forEach(th => {
        th.classList.toggle('sorted', th.dataset.key === sortKey);
    });
}

// ---- Toggle: Current Season <-> Career ----
toggleEl.addEventListener('change', () => {
    viewMode = toggleEl.checked ? 'career' : 'current';
    currentLabel.classList.toggle('active-label', viewMode === 'current');
    careerLabel.classList.toggle('active-label', viewMode === 'career');
    render();
});

// ---- Sortable headers ----
document.querySelectorAll('#stats-table thead th').forEach(th => {
    th.addEventListener('click', () => {
        const key = th.dataset.key;
        const type = th.dataset.type;
        if (sortKey === key) {
            sortDir = sortDir === 'desc' ? 'asc' : 'desc';
        } else {
            sortKey = key;
            sortDir = type === 'string' ? 'asc' : 'desc';
        }
        render();
    });
});

loadStats();
