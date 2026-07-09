const fs = require('fs');
const path = require('path');
const vm = require('vm');

let code = fs.readFileSync(path.join(__dirname, '../public/vergemap/js/systemGenerator.js'), 'utf-8');
code = code.replace(/import .*? from .*?;/g, '');
code = code.replace(/export function/g, 'function');

const sandbox = {
    Math: Math,
    parseFloat: parseFloat,
    parseInt: parseInt,
    console: console,
    document: {
        createElement: (tag) => {
            if (tag === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext: () => ({
                        beginPath: () => {},
                        arc: () => {},
                        fill: () => {},
                        createRadialGradient: () => ({ addColorStop: () => {} }),
                        fillRect: () => {}
                    })
                };
            }
            return {};
        }
    },
    THREE: {
        CanvasTexture: class { constructor() {} },
        Group: class { constructor() { this.rotation = {}; this.position = { set: () => {} }; } add() {} remove() {} traverse() {} },
        Mesh: class { constructor() { this.position = { set: () => {} }; this.rotation = {}; this.userData = {}; this.add = () => {}; } },
        SphereGeometry: class {},
        IcosahedronGeometry: class {},
        RingGeometry: class {},
        BufferGeometry: class { setFromPoints() { return this; } setAttribute() {} },
        ShaderMaterial: class {},
        MeshStandardMaterial: class {},
        MeshBasicMaterial: class {},
        LineBasicMaterial: class {},
        LineLoop: class { constructor() { this.position = { set: () => {} }; this.rotation = {}; this.add = () => {}; } },
        PointLight: class {},
        Color: class { constructor() {} multiplyScalar() { return this; } lerp() { return this; } },
        EllipseCurve: class { getPoints() { return []; } },
        TextureLoader: class { load() { return {}; } },
        PointsMaterial: class {},
        Points: class { constructor() { this.rotation = {}; this.position = { set: () => {} }; this.add = () => {}; } },
        BufferAttribute: class {},
        SRGBColorSpace: "srgb",
        DoubleSide: 2,
        BackSide: 1,
        AdditiveBlending: 2,
        NormalBlending: 1
    }
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const systems = [];
const CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

for (let i = 0; i < 5000; i++) {
    const starClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
    const systemData = {
        id: 'sys_' + i,
        name: 'Test System ' + i,
        class: starClass,
        systemSeed: Math.random().toString(36).substring(2)
    };
    sandbox.generateSystem(systemData, 'Normal');
    systems.push(systemData);
}

// Validator Logic
let viableCount = 0;
let viableWithTechCount = 0;
let counts = { Terran: 0, Eyeball: 0, Ocean: 0, Desert: 0, Rocky: 0 };
let techCounts = { Terran: 0, Eyeball: 0, Ocean: 0, Desert: 0, Rocky: 0, Ice: 0, GasGiant: 0 };

let subtypes = {};
let featuresCount = {};

systems.forEach(sys => {
    if (!sys.planets || sys.planets.length === 0) return;
    
    let hasViable = false;
    let hasTechViable = false;
    
    sys.planets.forEach(p => {
        if (p.type === 'Natural Satellite') return;
        
        if (p.subtype) subtypes[p.subtype] = (subtypes[p.subtype] || 0) + 1;
        if (p.features) {
            p.features.forEach(f => {
                featuresCount[f] = (featuresCount[f] || 0) + 1;
            });
        }
        
        const tempK = parseInt(p.temperature);
        let isPerfect = false;
        
        // Pure Viable Check
        if (p.atmosphere === "Nitrogen/Oxygen (1 atm)" && tempK >= 250 && tempK <= 350) {
            hasViable = true;
            isPerfect = true;
            if (p.type === 'Terran World') counts.Terran++;
            if (p.type === 'Eyeball World') counts.Eyeball++;
            if (p.type === 'Ocean World') counts.Ocean++;
            if (p.type === 'Desert World') counts.Desert++;
            if (p.type === 'Rocky World') counts.Rocky++;
        }
        
        // Viable With Tech (GRAPH +/- 1 from optimal)
        if (!isPerfect && p.graph) {
            const match = p.graph.match(/G(\d+)\/R(\d+)\/A(\d+)\/P(\d+)\/H(\d+)/);
            if (match) {
                const g = parseInt(match[1]);
                const r = parseInt(match[2]);
                const a = parseInt(match[3]);
                const pr = parseInt(match[4]);
                const h = parseInt(match[5]);
                
                if (g >= 1 && g <= 3 && r <= 3 && pr <= 3 && h >= 1 && h <= 3) {
                    hasTechViable = true;
                    if (p.type === 'Terran World') techCounts.Terran++;
                    else if (p.type === 'Eyeball World') techCounts.Eyeball++;
                    else if (p.type === 'Ocean World') techCounts.Ocean++;
                    else if (p.type === 'Desert World') techCounts.Desert++;
                    else if (p.type === 'Rocky World') techCounts.Rocky++;
                    else if (p.type === 'Ice World') techCounts.Ice++;
                    else if (p.type === 'Gas Giant') techCounts.GasGiant++;
                }
            }
        }
    });
    
    if (hasViable) viableCount++;
    if (hasTechViable && !hasViable) viableWithTechCount++; 
});

console.log(`\n--- Validation Complete ---`);
console.log(`Total Systems Generated: ${systems.length}`);
console.log(`Total Perfect Viable Systems: ${viableCount} (${((viableCount/systems.length)*100).toFixed(2)}%)`);
console.log(`Total 'Viable With Tech' Systems (Exclusive): ${viableWithTechCount} (${((viableWithTechCount/systems.length)*100).toFixed(2)}%)`);
console.log(`Combined Habitable Systems: ${viableCount + viableWithTechCount} (${(((viableCount + viableWithTechCount)/systems.length)*100).toFixed(2)}%)`);

console.log(`\n--- Perfect Viable Planet Types ---`);
console.log(`Terran: ${counts.Terran}, Eyeball: ${counts.Eyeball}, Ocean: ${counts.Ocean}, Desert: ${counts.Desert}, Rocky: ${counts.Rocky}`);

console.log(`\n--- 'Viable With Tech' Planet Types ---`);
console.log(`Terran: ${techCounts.Terran}, Eyeball: ${techCounts.Eyeball}, Ocean: ${techCounts.Ocean}, Desert: ${techCounts.Desert}, Rocky: ${techCounts.Rocky}, Ice: ${techCounts.Ice}, Gas: ${techCounts.GasGiant}`);

console.log(`\n--- Subtype Distribution ---`);
Object.keys(subtypes).sort((a,b) => subtypes[b] - subtypes[a]).forEach(k => console.log(`${k}: ${subtypes[k]}`));

console.log(`\n--- Feature Distribution ---`);
Object.keys(featuresCount).sort((a,b) => featuresCount[b] - featuresCount[a]).forEach(k => console.log(`${k}: ${featuresCount[k]}`));

