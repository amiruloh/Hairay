export function adjustColor(hex, shift) {
    let r = parseInt(hex.slice(1,3), 16);
    let g = parseInt(hex.slice(3,5), 16);
    let b = parseInt(hex.slice(5,7), 16);
    r = Math.min(255, Math.max(0, r + shift * 255));
    g = Math.min(255, Math.max(0, g + shift * 255));
    b = Math.min(255, Math.max(0, b + shift * 255));
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

export function mulberry32(seed) {
    return function() {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function debounce(fn, delay) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

// Canvas → Blob helper
export function canvasToBlob(canvas) {
    return new Promise(res => canvas.toBlob(res, 'image/png'));
}