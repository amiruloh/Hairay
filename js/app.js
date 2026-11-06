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
const mapSwitcher = document.getElementById('mapSwitcher');

// ============ MAP SWITCHER ============
function buildMapSwitcher() {
    if (!mapSwitcher) return;
    mapSwitcher.innerHTML = '';
    MAPS.forEach(map => {
        const btn = document.createElement('button');
        btn.className = 'map-btn';
        btn.dataset.map = map;
        btn.textContent = MAP_LABELS[map];

        btn.addEventListener('click', () => {
            state.currentMap = map;
            updateSwitcherActive();
            renderCurrentMap();
        });

        mapSwitcher.appendChild(btn);
    });
    updateSwitcherActive();
}

function updateSwitcherActive() {
    document.querySelectorAll('.map-btn').forEach(el => {
        el.classList.toggle('active', el.dataset.map === state.currentMap);
    });
}

// ============ ZOOM LOGIC ============
let zoomLevel = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX, startY;

function applyZoom() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
    if (zoomLevel > 1) {
        canvas.classList.add('zoom-in');
    } else {
        canvas.classList.remove('zoom-in');
    }
}

document.getElementById('zoomInBtn')?.addEventListener('click', () => {
    zoomLevel = Math.min(3, zoomLevel + 0.2);
    applyZoom();
});

document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
    zoomLevel = Math.max(0.5, zoomLevel - 0.2);
    applyZoom();
});

document.getElementById('resetZoomBtn')?.addEventListener('click', () => {
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    applyZoom();
});

// Drag to Pan (saat di-zoom)
canvas.addEventListener('mousedown', (e) => {
    if (zoomLevel > 1) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        canvas.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        applyZoom();
    }
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
    }
});

// Scroll to Zoom (Ctrl + Scroll)
document.getElementById('canvasWrapper')?.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomLevel = Math.min(3, zoomLevel + 0.1);
        } else {
            zoomLevel = Math.max(0.5, zoomLevel - 0.1);
        }
        applyZoom();
    }
}, { passive: false });


// ============ MAIN RENDER ============
function renderCurrentMap() {
    renderMap(canvas, ctx, inputs, state.currentMap);
    if (statusText) statusText.textContent = MAP_LABELS[state.currentMap];
}

function updateApp(regenerate = true) {
    if (regenerate) {
        generateData(canvas, inputs);
        renderInternalHeightMap(canvas, ctx, inputs);
    }
    renderCurrentMap();
    
    if (statusInfo) {
        statusInfo.textContent = `${canvas.width} × ${canvas.height} · ${state.strandsData.length} strands`;
    }
}

// ============ DEBOUNCED UPDATE ============
let updateTimer = null;
function scheduleUpdate() {
    if (statusText) statusText.textContent = 'Rendering...';
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
        updateApp(true);
        if (statusText) statusText.textContent = MAP_LABELS[state.currentMap];
    }, 120);
}

// ============ LISTENERS ============

// 1. Tombol Apply Resolution
const applyResBtn = document.getElementById('applyResBtn');
if (applyResBtn) {
    applyResBtn.addEventListener('click', () => {
        const w = parseInt(resWidth.value);
        const h = parseInt(resHeight.value);
        if (w >= 128 && h >= 128 && w <= 4096 && h <= 4096) {
            canvas.width = w;
            canvas.height = h;
            updateApp(true);
            showToast(`✓ Resolution → ${w} × ${h}`);
            
            const label = document.getElementById('resLabel');
            if (label) label.textContent = `${w}×${h}`;
            document.getElementById('resDropdown').classList.remove('open');
        } else {
            showToast('⚠ Resolution tidak valid (128–4096)');
        }
    });
}

// 2. Input Range & Color Listener
Object.keys(inputs).forEach(key => {
    const el = inputs[key];
    if (!el) return;
    
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

// 3. Toolbar Buttons
document.getElementById('toggleBg')?.addEventListener('click', () => {
    state.lightBg = !state.lightBg;
    document.getElementById('workspace').classList.toggle('light-bg', state.lightBg);
});

// 4. Dropdown Logic
function setupDropdown(toggleId, dropdownId) {
    const toggle = document.getElementById(toggleId);
    const dropdown = document.getElementById(dropdownId);
    if (!toggle || !dropdown) return;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown.open').forEach(d => {
            if (d !== dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open');
    });

    dropdown.addEventListener('click', (e) => {
        if (e.target.closest('.dropdown-menu')) e.stopPropagation();
    });
}

setupDropdown('presetToggle', 'presetDropdown');
setupDropdown('resToggle', 'resDropdown');

document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
});

// 5. Preset Logic
const PRESETS = {
    straight: { wave: 3, freq: 2, bend: 0, clump: 10, thickness: 4, count: 300 },
    wavy:     { wave: 25, freq: 3, bend: 20, clump: 25, thickness: 5, count: 400 },
    curly:    { wave: 55, freq: 6, bend: 80, clump: 60, thickness: 6, count: 500 },
    messy:    { wave: 40, freq: 4, bend: -40, clump: 40, thickness: 3, count: 600 }
};

document.querySelectorAll('.dropdown-item[data-preset]').forEach(btn => {
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
        document.getElementById('presetDropdown').classList.remove('open');
    });
});

// 6. Download
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById('downloadBtn')?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `hair_${state.currentMap}_${canvas.width}x${canvas.height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast(`✓ ${MAP_LABELS[state.currentMap]} downloaded`);
});

// 7. Batch ZIP
document.getElementById('downloadAllBtn')?.addEventListener('click', async () => {
    try {
        setLoading(true, 'Building ZIP...');
        const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
        const zip = new JSZip();
        const off = document.createElement('canvas');
        off.width = canvas.width;
        off.height = canvas.height;
        const octx = off.getContext('2d');

        for (const map of MAPS) {
            renderMap(off, octx, inputs, map);
            const blob = await canvasToBlob(off);
            zip.file(`hair_${map}_${canvas.width}x${canvas.height}.png`, blob);
        }

        const meta = {
            resolution: { width: canvas.width, height: canvas.height },
            strandCount: state.strandsData.length,
            params: Object.fromEntries(
                Object.entries(inputs).filter(([_, el]) => el).map(([k, el]) => [k, el.value])
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

// ============ INIT ============
buildMapSwitcher();
Object.values(inputs).forEach(el => {
    if (el && el.type === 'range') updateRangeFill(el);
});
updateApp(true);