// ---- Config ----
const RECORDS_FILE = '../data/records.xlsx';
const SHEET_NAME = 'Sheet1';

const DEFAULT_INDIVIDUAL = '1000 Point Club';
const DEFAULT_TEAM = 'Win %';

// Maps each record_type to how its "value" column should be labeled
// and formatted. Add a line here any time a brand new record_type is
// added to the spreadsheet -- if a type is missing from this map, it
// just falls back to a generic "Total" label, unformatted.
const VALUE_CONFIG = {
    "1000 Point Club": { label: "Career Points", suffix: "" },
    "Career Assists": { label: "Career Assists", suffix: "" },
    "Career Rebounds": { label: "Career Rebounds", suffix: "" },
    "Points in Single Game": { label: "Points", suffix: "" },
    "Single Game Assists": { label: "Assists", suffix: "" },
    "Single Game Rebounds (Since 2012)": { label: "Rebounds", suffix: "" },
    "Single Game Steals": { label: "Steals", suffix: "" },
    "Single Season 2 PT FG % (Min 100 attempts)": { label: "FG%", suffix: "%" },
    "Single Season 3 PT FG % (Min 25 Attempts)": { label: "3PT%", suffix: "%" },
    "Single Season Assists": { label: "Assists", suffix: "" },
    "Single Season Blocks": { label: "Blocks", suffix: "" },
    "Single Season FT % (min 40 attempts)": { label: "FT%", suffix: "%" },
    "Single Season PPG": { label: "PPG", suffix: "" },
    "Single Season RPG (Since 2012)": { label: "RPG", suffix: "" },
    "Single Season Steals": { label: "Steals", suffix: "" },

    "Single Game Points Scored": { label: "Points", suffix: "" },
    "Single Season FG % (2pt)": { label: "FG%", suffix: "%" },
    "Single Season FG % (3pt)": { label: "3PT%", suffix: "%" },
    "Single Season FT %": { label: "FT%", suffix: "%" },
    "Single Season Points Allowed": { label: "PPG Allowed", suffix: "" },
    "Single Season Points Scored": { label: "Total Points", suffix: "" },
    "Win %": { label: "Win %", suffix: "%" },
};

let allRecords = [];
let viewCategory = 'Individual'; // 'Individual' | 'Team'
let activeRecordType = DEFAULT_INDIVIDUAL;

const statusEl = document.getElementById('records-status');
const tableEl = document.getElementById('records-table');
const captionEl = document.getElementById('records-caption');
const headRowEl = document.getElementById('records-head-row');
const bodyEl = document.getElementById('records-body');
const pillsEl = document.getElementById('records-pills');
const activeNoteEl = document.getElementById('records-active-note');
const toggleEl = document.getElementById('records-toggle');
const individualLabel = document.getElementById('records-individual-label');
const teamLabel = document.getElementById('records-team-label');

function loadRecords() {
    fetch(RECORDS_FILE)
        .then(res => {
            if (!res.ok) throw new Error('Could not load records file');
            return res.arrayBuffer();
        })
        .then(buffer => {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[SHEET_NAME] || workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: null });

            allRecords = json.map(r => ({
                category: r.category ? String(r.category).trim() : '',
                record_type: r.record_type ? String(r.record_type).trim() : '',
                rank: r.rank !== null && r.rank !== undefined ? Number(r.rank) : null,
                value: r.value !== null && r.value !== undefined ? Number(r.value) : null,
                holder: r.holder ? String(r.holder).trim() : '',
                season: r.season !== null && r.season !== undefined ? String(r.season).trim() : '',
                date: r.date ? String(r.date).trim() : '',
                opponent: r.opponent ? String(r.opponent).trim() : '',
                active: r.active ? String(r.active).trim().toLowerCase() === 'yes' : false,
            })).filter(r => r.category && r.record_type);

            if (allRecords.length === 0) {
                statusEl.textContent = 'No records found yet.';
                return;
            }

            statusEl.style.display = 'none';
            tableEl.style.display = 'table';
            renderPills();
            render();
        })
        .catch(err => {
            console.error(err);
            statusEl.textContent = 'Records are temporarily unavailable. Please check back later.';
        });
}

function recordTypesFor(category) {
    return [...new Set(
        allRecords.filter(r => r.category === category).map(r => r.record_type)
    )].sort();
}

function renderPills() {
    const types = recordTypesFor(viewCategory);
    pillsEl.innerHTML = '';
    types.forEach(rt => {
        const btn = document.createElement('button');
        btn.className = 'record-pill' + (rt === activeRecordType ? ' active' : '');
        btn.textContent = rt;
        btn.addEventListener('click', () => {
            activeRecordType = rt;
            renderPills();
            render();
        });
        pillsEl.appendChild(btn);
    });
}

function formatValue(value, config) {
    if (value === null) return '';
    // Show one decimal place for non-integer values (percentages, PPG, etc).
    const display = Number.isInteger(value) ? value : value.toFixed(1);
    return display + (config.suffix || '');
}

function render() {
    const config = VALUE_CONFIG[activeRecordType] || { label: 'Total', suffix: '' };
    const rows = allRecords
        .filter(r => r.category === viewCategory && r.record_type === activeRecordType)
        .sort((a, b) => {
            if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
            return (b.value ?? 0) - (a.value ?? 0);
        });

    captionEl.textContent = activeRecordType;

    const hasHolder = rows.some(r => r.holder);
    const hasSeason = rows.some(r => r.season);
    const hasDate = rows.some(r => r.date);
    const hasOpponent = rows.some(r => r.opponent);
    const hasRank = rows.some(r => r.rank !== null);

    // Build header row dynamically -- only show columns that are
    // actually populated for this record type, so e.g. team records
    // with no holder don't show a blank "Player" column.
    const columns = [];
    if (hasRank) columns.push({ key: 'rank', label: '#' });
    if (hasHolder) columns.push({ key: 'holder', label: viewCategory === 'Individual' ? 'Player' : 'Team' });
    columns.push({ key: 'value', label: config.label });
    if (hasSeason) columns.push({ key: 'season', label: 'Season' });
    if (hasDate) columns.push({ key: 'date', label: 'Date' });
    if (hasOpponent) columns.push({ key: 'opponent', label: 'Opponent' });

    headRowEl.innerHTML = '';
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        headRowEl.appendChild(th);
    });

    bodyEl.innerHTML = '';
    let anyActive = false;

    rows.forEach(r => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            if (col.key === 'rank') {
                td.textContent = r.rank ?? '';
            } else if (col.key === 'holder') {
                td.className = 'holder-cell';
                let name = r.holder || '\u2014';
                if (r.active) {
                    name += '*';
                    anyActive = true;
                }
                td.textContent = name;
            } else if (col.key === 'value') {
                td.textContent = formatValue(r.value, config);
            } else {
                td.textContent = r[col.key] || '';
            }
            tr.appendChild(td);
        });
        bodyEl.appendChild(tr);
    });

    activeNoteEl.style.display = anyActive ? 'block' : 'none';
}

toggleEl.addEventListener('change', () => {
    viewCategory = toggleEl.checked ? 'Team' : 'Individual';
    activeRecordType = toggleEl.checked ? DEFAULT_TEAM : DEFAULT_INDIVIDUAL;
    individualLabel.classList.toggle('active-label', viewCategory === 'Individual');
    teamLabel.classList.toggle('active-label', viewCategory === 'Team');
    renderPills();
    render();
});

loadRecords();
