export function showToast(msg, duration = 2000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
}

export function setLoading(show, text = 'Generating...') {
    const el = document.getElementById('loader');
    const p = document.getElementById('loaderText');
    if (p) p.textContent = text;
    el.classList.toggle('hidden', !show);
}

export function updateRangeFill(input) {
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const val = parseFloat(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--p', pct + '%');
}