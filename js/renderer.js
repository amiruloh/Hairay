import { state } from './state.js';
import { adjustColor } from './utils.js';

function drawStrand(ctx, strand, thickness, inputs, strokeStyle = null, taper = false) {
    const waviness = parseInt(inputs.wave.value);
    const freq = parseInt(inputs.freq.value);
    const bend = parseInt(inputs.bend.value);

    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (strokeStyle) ctx.strokeStyle = strokeStyle;

    ctx.beginPath();
    for (let y = 0; y <= strand.endY; y += 4) {
        const progress = y / strand.endY;
        const waveX = Math.sin((progress * Math.PI * freq) + strand.waveOffset) * waviness * progress;
        const bendX = (progress * progress) * bend * strand.bendScale;
        const x = strand.x + waveX + bendX;

        if (taper) {
            const currentThick = thickness * (1 - Math.pow(progress, 2));
            if (currentThick < 0.2) break;
            ctx.lineWidth = currentThick;
        }
        ctx.lineTo(x, y);
    }
    ctx.stroke();
}

export function renderInternalHeightMap(canvas, ctx, inputs) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    const sorted = [...state.strandsData].sort((a,b) => a.depth - b.depth);
    sorted.forEach(strand => {
        const thickness = parseInt(inputs.thickness.value) * strand.thicknessScale;
        ctx.strokeStyle = 'rgba(25, 25, 25, 1)';
        drawStrand(ctx, strand, thickness, inputs);
    });
    ctx.globalCompositeOperation = 'source-over';
    state.heightMapData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Render satu map ke target canvas/ctx.
 * Bisa dipakai untuk main canvas ATAU thumbnail kecil.
 */
export function renderMap(targetCanvas, ctx, inputs, mapType) {
    const W = targetCanvas.width;
    const H = targetCanvas.height;

    ctx.fillStyle = (mapType === 'normal') ? '#8080FF' : '#000';
    ctx.fillRect(0, 0, W, H);

    if (!state.heightMapData) return;

    // Scale factor (karena thumbnail lebih kecil dari heightMap asli)
    const srcW = state.heightMapData.width;
    const srcH = state.heightMapData.height;
    const scaleX = W / srcW;
    const scaleY = H / srcH;

    switch (mapType) {
        case 'height': {
            // Pakai canvas temporer untuk scaling
            const tmp = document.createElement('canvas');
            tmp.width = W; tmp.height = H;
            const tctx = tmp.getContext('2d');
            // Gambar heightMap yang asli ke tmp dengan scale
            const off = document.createElement('canvas');
            off.width = srcW; off.height = srcH;
            off.getContext('2d').putImageData(state.heightMapData, 0, 0);
            tctx.drawImage(off, 0, 0, W, H);
            ctx.drawImage(tmp, 0, 0);
            break;
        }

        case 'alpha': {
            const imgData = ctx.createImageData(W, H);
            const d = state.heightMapData.data;
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const sx = Math.floor(x / scaleX);
                    const sy = Math.floor(y / scaleY);
                    const si = (sy * srcW + sx) * 4;
                    const di = (y * W + x) * 4;
                    const v = (d[si] > 10) ? 255 : 0;
                    imgData.data[di] = imgData.data[di+1] = imgData.data[di+2] = v;
                    imgData.data[di+3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            break;
        }

        case 'color': {
            const rootHex = inputs.rootColor.value;
            const tipHex = inputs.tipColor.value;
            const variance = parseInt(inputs.variance.value) / 100;

            // scale transform agar strand digambar relatif ke ukuran target
            ctx.save();
            ctx.scale(scaleX, scaleY);

            const sorted = [...state.strandsData].sort((a,b) => a.depth - b.depth);
            sorted.forEach(strand => {
                const thickness = parseInt(inputs.thickness.value) * strand.thicknessScale;
                const shift = strand.colorShift * variance;
                const rColor = adjustColor(rootHex, shift);
                const tColor = adjustColor(tipHex, shift);

                const gradient = ctx.createLinearGradient(0, 0, 0, strand.endY);
                gradient.addColorStop(0, rColor);
                gradient.addColorStop(1, tColor);

                drawStrand(ctx, strand, thickness, inputs, gradient);
            });
            ctx.restore();
            break;
        }

        case 'ao': {
            const imgData = ctx.createImageData(W, H);
            const d = state.heightMapData.data;
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const sx = Math.floor(x / scaleX);
                    const sy = Math.floor(y / scaleY);
                    const si = (sy * srcW + sx) * 4;
                    const di = (y * W + x) * 4;
                    const h = d[si];
                    const aoVal = h < 5 ? 255 : Math.min(255, h * 1.5 + 50);
                    imgData.data[di] = imgData.data[di+1] = imgData.data[di+2] = aoVal;
                    imgData.data[di+3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            break;
        }

        case 'normal': {
            const imgData = ctx.createImageData(W, H);
            const d = state.heightMapData.data;
            const strength = parseFloat(inputs.normalStrength.value);
            const nz = 255 / strength;

            const getVal = (x, y) => {
                if (x < 0 || x >= W || y < 0 || y >= H) return 0;
                const sx = Math.floor(x / scaleX);
                const sy = Math.floor(y / scaleY);
                return d[(sy * srcW + sx) * 4];
            };

            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const idx = (y * W + x) * 4;
                    if (getVal(x, y) < 5) {
                        imgData.data[idx] = 128;
                        imgData.data[idx+1] = 128;
                        imgData.data[idx+2] = 255;
                        imgData.data[idx+3] = 255;
                        continue;
                    }

                    const tl = getVal(x-1, y-1), tc = getVal(x, y-1), tr = getVal(x+1, y-1);
                    const ml = getVal(x-1, y),                    mr = getVal(x+1, y);
                    const bl = getVal(x-1, y+1), bc = getVal(x, y+1), br = getVal(x+1, y+1);

                    const dX = (tr + 2*mr + br) - (tl + 2*ml + bl);
                    const dY = (bl + 2*bc + br) - (tl + 2*tc + tr);

                    const len = Math.sqrt(dX*dX + dY*dY + nz*nz);
                    const nx = dX / len;
                    const ny = dY / len;
                    const normalZ = nz / len;

                    imgData.data[idx]   = Math.floor((nx + 1) * 127.5);
                    imgData.data[idx+1] = Math.floor((ny + 1) * 127.5);
                    imgData.data[idx+2] = Math.floor(normalZ * 255);
                    imgData.data[idx+3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            break;
        }

        case 'root': {
            ctx.save();
            ctx.scale(scaleX, scaleY);
            state.strandsData.forEach(strand => {
                const thickness = parseInt(inputs.thickness.value) * strand.thicknessScale;
                const gradient = ctx.createLinearGradient(0, 0, 0, strand.endY);
                gradient.addColorStop(0, 'black');
                gradient.addColorStop(1, 'white');
                drawStrand(ctx, strand, thickness, inputs, gradient, true);
            });
            ctx.restore();
            break;
        }
    }
}