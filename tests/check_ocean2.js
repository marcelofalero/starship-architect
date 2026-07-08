const fs = require('fs');
const sysVal = fs.readFileSync('/home/mfalero/Projects/Personal/starship-architect/tests/system_validator.js', 'utf8');
const lines = sysVal.split('\n');
const insertIdx = lines.findIndex(l => l.includes("systems.forEach(sys => {"));
lines.splice(insertIdx, 0, `
let oceanWorlds = [];
systems.forEach(s => {
    if(s.planets) s.planets.forEach(p => {
        if(p.type === 'Ocean World') oceanWorlds.push({atm: p.atmosphere, t: p.temperature, g: p.graph});
    });
});
console.log("Total Oceans generated: " + oceanWorlds.length);
console.log(oceanWorlds.slice(0, 5));
`);
fs.writeFileSync('/home/mfalero/Projects/Personal/starship-architect/tests/check_ocean2_run.js', lines.join('\n'));
