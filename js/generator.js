import { state } from './state.js';
import { mulberry32 } from './utils.js';

export function generateData(canvas, inputs) {
    const count = parseInt(inputs.count.value);
    const seed = parseInt(inputs.seed.value);
    const rnd = mulberry32(seed);
    state.strandsData = [];

    const centerX = canvas.width / 2;
    const spread = parseInt(inputs.spread.value);
    const clump = parseInt(inputs.clump.value) / 100;

    // Clump centers (untuk clustering)
    const clumpCount = Math.max(1, Math.floor(count * clump / 15));
    const clumps = [];
    for (let i = 0; i < clumpCount; i++) {
        clumps.push({
            x: centerX + (rnd() * spread * 2 - spread),
            offset: rnd() * Math.PI * 2
        });
    }

    for (let i = 0; i < count; i++) {
        let startX;
        if (clump > 0 && clumps.length > 0) {
            // Blend antara random dan clump
            const clumpIdx = Math.floor(rnd() * clumps.length);
            const clumpX = clumps[clumpIdx].x + (rnd() - 0.5) * spread * 0.15;
            const randX = centerX + (rnd() * spread * 2 - spread);
            startX = clumpX * clump + randX * (1 - clump);
        } else {
            startX = centerX + (rnd() * spread * 2 - spread);
        }

        const lengthPercent = parseInt(inputs.length.value) / 100;
        const minLen = 0.5 + (1 - lengthPercent) * 0.5;
        const endY = canvas.height * (minLen + rnd() * (1 - minLen));

        state.strandsData.push({
            x: startX,
            y: 0,
            endY: endY,
            waveOffset: rnd() * Math.PI * 2,
            thicknessScale: 0.5 + rnd() * 1.5,
            depth: rnd(),
            colorShift: (rnd() - 0.5),
            bendScale: 0.7 + rnd() * 0.6
        });
    }
}