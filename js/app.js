import { state, MAPS, MAP_LABELS } from './state.js';
import { generateData } from './generator.js';
import { renderInternalHeightMap, renderMap } from './renderer.js';
import { showToast, setLoading, updateRangeFill } from './ui.js';
import { canvasToBlob } from './utils.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const inputs = {
    count: document.getElementById('count'),
    thickness: document.getElementById('thickness'),
    length: document.getElementById('length'),
    bend: document.getElementById('bend'),
    wave: document.getElementById('wave'),
    freq: document.getElementById('freq'),
    spread: document.getElementById('spread'),
    clump: document.getElementById('clump'),
    seed: document.getElementById('seed'),
    rootColor: document.getElementById('rootColor'),
    tipColor: document.getElementById('tipColor'),
    variance: document.getElementById('variance'),
    normalStrength: document.getElementById('normalStrength')
};

const resWidth = document.getElementById('resWidth');
const resHeight = document.getElementById('resHeight');
const statusText = document.getElementById('statusText');
const statusInfo = document.getElementById('statusInfo');
const filmstripTrack = document.getElementById('filmstripTrack');

// ============ THUMBNAILS ============
// Simpan canvas thumbnail per map
const thumbs = {};

function buildFilmstrip() {
    filmstripTrack.innerHTML = '';
    MAPS.forEach(map => {
        const item = document.createElement('div');
        item.className = 'filmstrip-item';
        item.dataset.map = map;

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 84;
        thumbCanvas.height = 168; // ratio 1:2 mengikuti 512:1024
        item.appendChild(thumbCanvas);

        const label = document.createElement('div');
        label.className = 'filmstrip-label';
        label.textContent = MAP_LABELS[map];
        item.appendChild(label);

        item.addEventListener('click', () => {
            state.currentMap = map;
            updateFilmstripActive();
            renderCurrentMap();
        });

        filmstripTrack.appendChild(item);
        thumbs[map] = thumbCanvas;
    });
    updateFilmstripActive();
}

function updateFilmstripActive() {
    document.querySelectorAll('.filmstrip-item').forEach(el => {
        el.classList.toggle('active', el.dataset.map === state.currentMap);
    });
}

function renderThumbnails() {
    // Render semua map ke thumbnail kecil
    MAPS.forEach(map => {
        const tc = thumbs[map];
        if (!tc) return;
        const tctx = tc.getContext('2d');
        renderMap(tc, tctx, inputs, map);
    });
}

// ============ MAIN RENDER ============
function renderCurrentMap() {
    renderMap(canvas, ctx, inputs, state.currentMap);
    statusText.textContent = MAP_LABELS[state.currentMap];
}

function updateApp(regenerate = true) {
    if (regenerate) {
        generateData(canvas, inputs);
        renderInternalHeightMap(canvas, ctx, inputs);
    }
    renderCurrentMap();
    renderThumbnails();

    statusInfo.textContent =
        `${canvas.width} × ${canvas.height} · ${state.strandsData.length} strands`;
}

// ============ DEBOUNCED UPDATE ============
let updateTimer = null;
function scheduleUpdate() {
    statusText.textContent = 'Rendering...';
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
        updateApp(true);
        statusText.textContent = MAP_LABELS[state.currentMap];
    }, 120);
}

// ============ LISTENERS ============
document.getElementById('applyResBtn').addEventListener('click', () => {
    const w = parseInt(resWidth.value);
    const h = parseInt(resHeight.value);
    if (w >= 128 && h >= 128 && w <= 4096 && h <= 4096) {
        canvas.width = w;
        canvas.height = h;
        updateApp(true);
        showToast(`✓ Resolution → ${w} × ${h}`);
    } else {
        showToast('⚠ Resolution tidak valid (128–4096)');
    }
});

Object.keys(inputs).forEach(key => {
    const el = inputs[key];
    if (el.type === 'range') updateRangeFill(el);
    el.addEventListener('input', (e) => {
        if (key !== 'rootColor' && key !== 'tipColor') {
            const disp = document.getElementById(`val-${key}`);
            if (disp) {
                disp.innerText = key === 'length'
                    ? e.target.value + '%'
                    : e.target.value;
            }
            if (el.type === 'range') updateRangeFill(el);
        }
        scheduleUpdate();
    });
});

document.getElementById('generateBtn').addEventListener('click', () => {
    updateApp(true);
    showToast('🎨 Hair generated!');
});

// Toolbar
document.getElementById('toggleBg').addEventListener('click', () => {
    state.lightBg = !state.lightBg;
    document.getElementById('workspace').classList.toggle('light-bg', state.lightBg);
});

document.getElementById('resetZoom').addEventListener('click', () => {
    state.zoomed = false;
    canvas.classList.remove('zoom-in');
});

canvas.addEventListener('dblclick', () => {
    state.zoomed = !state.zoomed;
    canvas.classList.toggle('zoom-in', state.zoomed);
});

// ============ DOWNLOAD ============
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `hair_${state.currentMap}_${canvas.width}x${canvas.height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast(`✓ ${MAP_LABELS[state.currentMap]} downloaded`);
});

// ============ BATCH ZIP ============
document.getElementById('downloadAllBtn').addEventListener('click', async () => {
    try {
        setLoading(true, 'Building ZIP...');

        // Dynamic import JSZip
        const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
        const zip = new JSZip();

        // Render setiap map ke offscreen canvas full-size
        const off = document.createElement('canvas');
        off.width = canvas.width;
        off.height = canvas.height;
        const octx = off.getContext('2d');

        for (const map of MAPS) {
            renderMap(off, octx, inputs, map);
            const blob = await canvasToBlob(off);
            zip.file(`hair_${map}_${canvas.width}x${canvas.height}.png`, blob);
        }

        // Metadata JSON
        const meta = {
            resolution: { width: canvas.width, height: canvas.height },
            strandCount: state.strandsData.length,
            params: Object.fromEntries(
                Object.entries(inputs).map(([k, el]) => [k, el.value])
            ),
            maps: MAPS,
            generatedAt: new Date().toISOString()
        };
        zip.file('metadata.json', JSON.stringify(meta, null, 2));

        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        downloadBlob(zipBlob, `hair_textures_${canvas.width}x${canvas.height}_${Date.now()}.zip`);

        setLoading(false);
        showToast('📦 ZIP berhasil diunduh!');
    } catch (err) {
        console.error(err);
        setLoading(false);
        showToast('❌ Gagal export ZIP');
    }
});

// ============ PRESETS ============
const PRESETS = {
    straight: { wave: 3, freq: 2, bend: 0, clump: 10, thickness: 4, count: 300 },
    wavy:     { wave: 25, freq: 3, bend: 20, clump: 25, thickness: 5, count: 400 },
    curly:    { wave: 55, freq: 6, bend: 80, clump: 60, thickness: 6, count: 500 },
    messy:    { wave: 40, freq: 4, bend: -40, clump: 40, thickness: 3, count: 600 }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const p = PRESETS[btn.dataset.preset];
        if (!p) return;
        Object.entries(p).forEach(([key, val]) => {
            if (inputs[key]) {
                inputs[key].value = val;
                const disp = document.getElementById(`val-${key}`);
                if (disp) disp.innerText = val;
                if (inputs[key].type === 'range') updateRangeFill(inputs[key]);
            }
        });
        updateApp(true);
        showToast(`✨ Preset: ${btn.dataset.preset}`);
    });
});

// ============ INIT ============
buildFilmstrip();
// applyRangeFill untuk semua range
Object.values(inputs).forEach(el => {
    if (el.type === 'range') updateRangeFill(el);
});
updateApp(true);