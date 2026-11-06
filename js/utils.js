export function adjustColor(hex, shift) {
    let r = parseInt(hex.slice(1,3), 16);
    let g = parseInt(hex.slice(3,5), 16);
    let b = parseInt(hex.slice(5,7), 16);
    r = Math.min(255, Math.max(0, r + shift * 255));
    g = Math.min(255, Math.max(0, g + shift * 255));
    b = Math.min(255, Math.max(0, b + shift * 255));
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}