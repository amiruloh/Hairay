import { state } from './state.js';

export function generateData(canvas, inputs) {
    const count = parseInt(inputs.count.value);
    state.strandsData = [];
    
    for(let i = 0; i < count; i++) {
        const centerX = canvas.width / 2;
        const spread = parseInt(inputs.spread.value);
        const startX = centerX + (Math.random() * spread * 2 - spread);
        const lengthPercent = parseInt(inputs.length.value) / 100;
        const endY = canvas.height * (0.5 + Math.random() * 0.5 * lengthPercent);
        
        state.strandsData.push({
            x: startX,
            y: 0,
            endY: endY,
            waveOffset: Math.random() * Math.PI * 2,
            thicknessScale: 0.5 + Math.random() * 1.5,
            depth: Math.random(),
            colorShift: (Math.random() - 0.5)
        });
    }
}