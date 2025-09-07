const difficultyDict = {
    "TODT": 8,
    "TODC": 8.03,
    "TODCC": 8.05,
    "TT": 8.05,
    "Z7TR": 8.06,
    "R4TR": 8.12,
    "TOHA": 8.14,
    "SATR": 8.15,
    "TOEH": 8.17,
    "TOUH": 8.19,
    "TOBT": 8.21,
    "Z5TR": 8.21,
    "Z6TR": 8.23,
    "R9TR": 8.28,
    "FRTR": 8.35,
    "TOMB": 8.36,
    "R6TR": 8.45,
    "TOIF": 8.45,
    "TOCA": 8.45,
    "TOTL": 8.48,
    "TOIB": 8.57,
    "TOVS": 8.59,
    "TOPZ": 8.72,
    "R7TR": 8.78,
    "TOROMW": 8.81,
    "Z2TR": 8.84,
    "TOHR": 8.88,
    "TORER": 8.89,
    "ATTR": 8.94,
    "TOC": 8.94,
    "Z8TR": 8.96,
    "TPTR": 8.97,
    "R2TR": 8.98,
    "TOTHT": 8.99,
    "TOAE": 9,
    "R8TR": 9.05,
    "TOFACT": 9.05,
    "Z4TR": 9.06,
    "R5TR": 9.07,
    "TOBK": 9.08,
    "TOPB": 9.16,
    "TOAAA": 9.25,
    "TOHH": 9.36,
    "TOWF": 9.39,
    "TOTB": 9.43,
    "TOSM": 9.46,
    "TCTR": 9.53,
    "TOSO": 9.53,
    "TOTDA": 9.55,
    "TOBP": 9.6,
    "TSATR": 9.77,
    "Z9TR": 9.89,
    "TOEI": 9.95,
    "TOFM": 10,
    "TOIM": 10.1,
    "TOFN": 10.14,
    "TOCAV": 10.15,
    "Z1TR": 10.16,
    "TSTR": 10.3,
    "TOAR": 10.33,
    "TOMM": 10.33,
    "TTTR": 10.36,
    "Z10TR": 10.46,
    "TOJE": 10.5,
    "TONS": 10.6,
    "TOWWW": 10.66,
    "TOUA": 10.76,
    "TOI": 10.87,
    "TOAM": 11,
    "TOGF": 11.17,
    "TODIE": 11.36,
    "TOEMP": 11.42,
    "TORT": 11.64,
    "TOCR": 11.71,
    "TOER": 11.85,
    "TOCP": 11.99,
    "COV": 14.95
}

const difficulties = ["Insane", "Extreme", "Terrifying", "Catastrophic"];

const state = {
    towers: {},
    users: {},
    firstPerDifficulty: {},
    completions: [],
    seen: new Set()
};



// ===== UI STUFF =====
const towerList = document.getElementById("towerList");
const towerDetails = document.getElementById("towerDetails");
const searchBar = document.getElementById("searchBar");
const globalStatsDiv = document.getElementById("globalStats");
const towerRushToggle = document.getElementById("towerRushToggle");
const sortByUi = document.getElementById("sortBy");
const sortOrderUi = document.getElementById("sortOrder");
const filterResetBtn = document.getElementById("resetFilters");

let sortBy = "none";
let sortAsc = false;

sortByUi.addEventListener("change", e => {
    sortBy = e.target.value;
    renderTowerList();
});
sortOrderUi.addEventListener("click", () => {
    sortAsc = !sortAsc;
    sortOrderUi.textContent = sortAsc ? "⬆️" : "⬇️";
    renderTowerList();
});
filterResetBtn.addEventListener("click", () => {
    searchBar.value = "";
    sortBy = "none";
    sortAsc = false;
    sortByUi.value = "none";
    sortOrderUi.textContent = "⬇️";
    renderTowerList();
});
searchBar.addEventListener("input", (e) => renderTowerList(e.target.value));
towerRushToggle.addEventListener("change", () => {
    renderTowerList();
});



// ===== these are lowk functions if you think about it =====
function parseTime(str) {
    if (!str) return NaN;
    const parts = str.split(":").map(p => p.trim());
    if (parts.length === 1) return parseFloat(parts[0]) || 0;
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    return NaN;
}

function formatTime(sec) {
    if (!isFinite(sec)) return "-";
    sec = Math.round(sec * 100) / 100;
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = (sec % 60).toFixed(2).padStart(5, "0");
    return hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}:${secs}` : `${mins}:${secs}`;
}

function acronym(name) {
    let result = "";
    for (let i = 0; i < name.length; i++) {
        const ch = name[i];
        if (i === 0 || name[i-1] === " ") {
            if (/[a-zA-Z]/.test(ch)) result += ch.toUpperCase();
            else if (/[0-9]/.test(ch)) result += ch;
        }
    }
    return result;
}

function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}



// ===== process that info brotha =====
const diffEscaped = difficulties.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const LINE_RE = new RegExp(`^(.+?) has beaten (.+) of (${diffEscaped}) difficulty in ([0-9]{1,3}:[0-9]{2}(?:\\.[0-9]+)?), (\\d{4}-\\d{2}-\\d{2}T\\d{2})$`, 'i');

async function processLines(lines) {
    const CHUNK = 5000;
    const out = [];

    for (let i = 0; i < lines.length; i += CHUNK) {
        const slice = lines.slice(i, i + CHUNK);
        for (const lineRaw of slice) {
            const line = lineRaw.trim().replace(/^"+|"+$/g, '');
            const m = line.match(LINE_RE);
            if (!m) continue;
            let [, player, tower, diff, timeStr, timestamp] = m;
            player = player.trim(); tower = tower.trim(); diff = diff.trim(); timeStr = timeStr.trim(); timestamp = timestamp.trim();
            const canonical = difficulties.find(d => d.toLowerCase() === diff.toLowerCase());
            if (!canonical) continue;
            const seconds = parseTime(timeStr);
            if (!isFinite(seconds)) continue;
            out.push({player, tower, diff: canonical, timeStr, seconds, timestamp, key: `${player}||${tower}||${timeStr}||${timestamp}`});
        }
        await new Promise(r => setTimeout(r, 0));
    }
    return out;
}

function buildStatsBatch(newRuns) {
    for (const r of newRuns) {
        if (state.seen.has(r.key)) continue;
        state.seen.add(r.key);
        state.completions.push(r);
    }

    state.towers = {};
    state.users = {};
    state.firstPerDifficulty = {};

    state.completions.forEach(c => {
        const towerKey = c.tower;

        if (!state.towers[towerKey]) state.towers[towerKey] = {name: c.tower, completions: [], acronym: acronym(c.tower)};
        state.towers[towerKey].completions.push(c);

        if (!state.users[c.player]) state.users[c.player] = [];
        state.users[c.player].push(c);

        if (!state.firstPerDifficulty[c.diff]) state.firstPerDifficulty[c.diff] = c;
    });
}

function getTowerStats(t) {
    const runs = t.completions;
    const times = runs.map(r => r.seconds).filter(isFinite);
    const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length) : NaN;
    const fastest = runs.reduce((a, b) => a.seconds < b.seconds ? a : b, runs[0]);
    const slowest = runs.reduce((a, b) => a.seconds > b.seconds ? a : b, runs[0]);
    return { avg, fastest, slowest, count: runs.length, first: runs[0] };
}

function getGlobalStats() {
    const totalCompletions = state.completions.length;
    const totalTowers = Object.keys(state.towers).length;
    const totalUsers = Object.keys(state.users).length;
    const avgPerUser = totalUsers > 0 ? (totalCompletions / totalUsers).toFixed(2) : "0.00";
    return { totalCompletions, totalTowers, totalUsers, avgPerUser };
}



// ===== this is where the rendering happens =====
function renderGlobalStats() {
    const s = getGlobalStats();
    globalStatsDiv.classList.remove("hidden");
    globalStatsDiv.innerHTML = `<h3>Global Stats</h3>
    <div class="small">Total completions: <strong>${s.totalCompletions}</strong> - Unique towers: <strong>${s.totalTowers}</strong> - Unique players: <strong>${s.totalUsers}</strong></div>
    <div class="small">Avg towers/player: <strong>${s.avgPerUser}</strong></div>`;
}

function renderTowerList() {
    const query = searchBar.value.trim().toLowerCase();
    let towers = Object.values(state.towers);
    towers = towers.filter(t => t.name.toLowerCase().includes(query));
    towers = towers.filter(t => difficultyDict[t.acronym] !== undefined);
    if (!towerRushToggle.checked) {
        towers = towers.filter(t => !t.name.toLowerCase().includes("tower rush"));
    }

    towers.sort((a, b) => {
        if (sortBy === "none") return 0;
        const statsA = getTowerStats(a), statsB = getTowerStats(b);
        let valA, valB;
        if (sortBy === "completions") { valA = statsA.count; valB = statsB.count; }
        else if (sortBy === "avgTime") { valA = statsA.avg || Infinity; valB = statsB.avg || Infinity; }
        else if (sortBy === "difficulty") { valA = difficultyDict[a.acronym]; valB = difficultyDict[b.acronym]; }
        return sortAsc ? valA - valB : valB - valA;
    });

    towerList.innerHTML = "";
    towers.forEach(t => {
        const stats = getTowerStats(t);
        const div = document.createElement("div");
        div.textContent = `${t.name} (${stats.count} completions)`;
        div.onclick = () => renderTowerDetails(t);
        towerList.appendChild(div);
    });
}

function renderTowerDetails(t) {
    const stats = getTowerStats(t);
    const runsSorted = t.completions.slice().sort((a, b) => a.seconds - b.seconds);
    const total = runsSorted.length;
    let displayRuns = [];
    let note = "";

    if (total > 125) {
        const fastest = runsSorted.slice(0, Math.min(100, total));
        const slowest = runsSorted.slice(Math.max(0, total - 25));
        displayRuns = fastest.concat(slowest);
        note = `<p>Showing ${displayRuns.length} of ${total} completions</p>`;
    } else displayRuns = runsSorted;

    let runsHtml = `<table style="width:100%; border-collapse:collapse">
    <thead><tr><th style="width:48px">#</th><th>User</th><th style="width:110px">Time</th><th style="width:140px">Timestamp</th></tr></thead><tbody>`;

    if (total > 125) {
        //fastestCount = 100
        const slowestCount = displayRuns.length - 100;
        const slowestStartIndex = total - slowestCount;
        for (let i = 0; i < 100; i++) {
            const r = displayRuns[i];
            runsHtml += `<tr><td style="padding: 6px 8px">${i + 1}</td><td style="padding: 6px 8px">${escapeHtml(r.player)}</td><td style="padding: 6px 8px">${r.timeStr}</td><td style="padding: 6px 8px">${r.timestamp}</td></tr>`;
        }
        runsHtml += `<tr><td style="padding: 6px 8px">...</td><td style="padding: 6px 8px">...</td><td style="padding: 6px 8px">...</td><td style="padding: 6px 8px">...</td></tr>`;
        for (let i = 100; i < displayRuns.length; i++) {
            const r = displayRuns[i]; const rank = slowestStartIndex + (i - 100) + 1;
            runsHtml += `<tr><td style="padding: 6px 8px">${rank}</td><td style="padding: 6px 8px">${escapeHtml(r.player)}</td><td style="padding: 6px 8px">${r.timeStr}</td><td style="padding: 6px 8px">${r.timestamp}</td></tr>`;
        }
    } else {
        for (let i = 0; i < displayRuns.length; i++) {
            const r = displayRuns[i];
            runsHtml += `<tr><td style="padding: 6px 8px">${i + 1}</td><td style="padding: 6px 8px">${escapeHtml(r.player)}</td><td style="padding: 6px 8px">${r.timeStr}</td><td style="padding: 6px 8px">${r.timestamp}</td></tr>`;
        }
    }
    runsHtml += `</tbody></table>`;

    const avgText = isFinite(stats.avg) ? formatTime(stats.avg) : "-";
    const fastestText = stats.fastest ? `${escapeHtml(stats.fastest.player)} ${stats.fastest.timeStr}` : "-";
    const slowestText = stats.slowest ? `${escapeHtml(stats.slowest.player)} ${stats.slowest.timeStr}` : "-";

    towerDetails.innerHTML = `<h2>${escapeHtml(t.name)}</h2>
    <div class="small">Completions: <strong>${stats.count}</strong></div>
    <div style="margin-top: 8px">Average: <strong>${avgText}</strong> • Fastest: <strong>${fastestText}</strong> • Slowest: <strong>${slowestText}</strong></div>
    ${note}<hr style="margin: 10px 0"/><div style="max-height: 380px; overflow: auto">${runsHtml}</div>`;
}

// ===== initializaiotn =====
async function loadInfoJson() {
    try {
        const resp = await fetch("info.json");
        const data = await resp.json();
        let lines = [];
        if (Array.isArray(data)) {
            if (data.length && typeof data[0] === 'string') lines = data.slice();
            else if (data.length && typeof data[0] === 'object') lines = data.map(m => m.content || "").filter(Boolean);
        } else if (data && typeof data === 'object' && Array.isArray(data.messages)) {
            lines = data.messages.map(m => m.content || "").filter(Boolean);
        }

        const out = await processLines(lines);
        buildStatsBatch(out);
        renderGlobalStats();
        renderTowerList();
        towerDetails.innerHTML = "<p>Select a tower to view details</p>";
    } catch(err) {
        console.error("failed to load info.json", err);
    }
}

loadInfoJson();
