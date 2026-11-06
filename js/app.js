import { state } from './state.js';
import { generateData } from './generator.js';
import { renderInternalHeightMap, renderMap } from './renderer.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// UI Elements Map
const inputs = {
    count: document.getElementById('count'),
    thickness: document.getElementById('thickness'),
    length: document.getElementById('length'),
    bend: document.getElementById('bend'),
    wave: document.getElementById('wave'),
    freq: document.getElementById('freq'),
    spread: document.getElementById('spread'),
    rootColor: document.getElementById('rootColor'),
    tipColor: document.getElementById('tipColor'),
    variance: document.getElementById('variance')
};

const resWidth = document.getElementById('resWidth');
const resHeight = document.getElementById('resHeight');
const applyResBtn = document.getElementById('applyResBtn');

// Helper sequence to refresh graphics
function updateApp() {
    generateData(canvas, inputs);
    renderInternalHeightMap(canvas, ctx, inputs);
    renderMap(canvas, ctx, inputs);
}

// Event Listeners
applyResBtn.addEventListener('click', () => {
    const w = parseInt(resWidth.value);
    const h = parseInt(resHeight.value);
    if(w >= 128 && h >= 128) {
        canvas.width = w;
        canvas.height = h;
        updateApp();
    }
});

Object.keys(inputs).forEach(key => {
    inputs[key].addEventListener('input', (e) => {
        if (key !== 'rootColor' && key !== 'tipColor') {
            const displayEl = document.getElementById(`val-${key}`);
            if(displayEl) displayEl.innerText = key === 'length' ? e.target.value + '%' : e.target.value;
        }
        updateApp();
    });
});

document.getElementById('generateBtn').addEventListener('click', updateApp);

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        state.currentMap = e.target.getAttribute('data-map');
        
        // Only re-render the map view, no need to regenerate coordinates
        renderMap(canvas, ctx, inputs);
    });
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `hair_${state.currentMap}_${canvas.width}x${canvas.height}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
});

// Initialization
updateApp();