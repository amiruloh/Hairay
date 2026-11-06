import { state } from './state.js';
import { adjustColor } from './utils.js';

export function renderInternalHeightMap(canvas, ctx, inputs) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.globalCompositeOperation = 'lighter';
    
    state.strandsData.sort((a,b) => a.depth - b.depth).forEach(strand => {
        const thickness = parseInt(inputs.thickness.value) * strand.thicknessScale;
        ctx.strokeStyle = `rgba(25, 25, 25, 1)`; 
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        let waviness = parseInt(inputs.wave.value);
        let freq = parseInt(inputs.freq.value);
        let bend = parseInt(inputs.bend.value);
        
        for (let y = 0; y <= strand.endY; y += 5) {
            const progress = y / strand.endY;
            const waveX = Math.sin((progress * Math.PI * freq) + strand.waveOffset) * waviness * progress;
            const bendX = (progress * progress) * bend; 
            ctx.lineTo(strand.x + waveX + bendX, y);
        }
        ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
    state.heightMapData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function renderMap(canvas, ctx, inputs) {
    ctx.fillStyle = (state.currentMap === 'normal') ? '#8080FF' : '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.currentMap === 'height') {
        ctx.putImageData(state.heightMapData, 0, 0);
    } 
    else if (state.currentMap === 'alpha') {
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < state.heightMapData.data.length; i += 4) {
            const v = state.heightMapData.data[i] > 10 ? 255 : 0;
            imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = v;
            imgData.data[i+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
    }
    else if (state.currentMap === 'color') {
        const rootHex = inputs.rootColor.value;
        const tipHex = inputs.tipColor.value;
        const variance = parseInt(inputs.variance.value) / 100;

        state.strandsData.sort((a,b) => a.depth - b.depth).forEach(strand => {
            const thickness = parseInt(inputs.thickness.value) * strand.thicknessScale;
            
            const shift = strand.colorShift * variance;
            const rColor = adjustColor(rootHex, shift);
            const tColor = adjustColor(tipHex, shift);

            const gradient = ctx.createLinearGradient(0, 0, 0, strand.endY);
            gradient.addColorStop(0, rColor);
            gradient.addColorStop(1, tColor);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            let waviness = parseInt(inputs.wave.value);
            let freq = parseInt(inputs.freq.value);
            let bend = parseInt(inputs.bend.value);
            
            for (let y = 0; y <= strand.endY; y += 5) {
                const progress = y / strand.endY;
                const waveX = Math.sin((progress * Math.PI * freq) + strand.waveOffset) * waviness * progress;
                const bendX = (progress * progress) * bend;
                ctx.lineTo(strand.x + waveX + bendX, y);
            }
            ctx.stroke();
        });
    }
    else if (state.currentMap === 'ao') {
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < state.heightMapData.data.length; i += 4) {
            const h = state.heightMapData.data[i];
            const aoVal = h < 5 ? 255 : (h * 1.5 + 50); 
            const clamped = Math.min(255, Math.max(0, aoVal));
            imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = clamped;
            imgData.data[i+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
    }
    else if (state.currentMap === 'normal') {
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        const w = canvas.width;
        const h = canvas.height;
        const d = state.heightMapData.data;

        const getVal = (x, y) => {
            if (x < 0 || x >= w || y < 0 || y >= h) return 0;
            return d[(y * w + x) * 4]; 
        };

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                if (d[idx] < 5) {
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
                
                const strength = 1.5;
                const nz = 255 / strength;
                
                const length = Math.sqrt(dX*dX + dY*dY + nz*nz);
                const nx = dX / length;
                const ny = dY / length;
                const normalZ = nz / length;

                imgData.data[idx] = Math.floor((nx + 1.0) * 127.5);     
                imgData.data[idx+1] = Math.floor((ny + 1.0) * 127.5);   
                imgData.data[idx+2] = Math.floor(normalZ * 255);        
                imgData.data[idx+3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }
    else if (state.currentMap === 'root') {
        state.strandsData.forEach(strand => {
            const thickness = parseInt(inputs.thickness.value) * strand.thicknessScale;
            const gradient = ctx.createLinearGradient(0, 0, 0, strand.endY);
            gradient.addColorStop(0, "black");
            gradient.addColorStop(1, "white");
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            let waviness = parseInt(inputs.wave.value);
            let freq = parseInt(inputs.freq.value);
            let bend = parseInt(inputs.bend.value);
            
            for (let y = 0; y <= strand.endY; y += 5) {
                const progress = y / strand.endY;
                const currentThick = thickness * (1 - Math.pow(progress, 2));
                if(currentThick < 0.1) break;
                
                const waveX = Math.sin((progress * Math.PI * freq) + strand.waveOffset) * waviness * progress;
                const bendX = (progress * progress) * bend;
                ctx.lineTo(strand.x + waveX + bendX, y);
            }
            ctx.stroke();
        });
    }
}