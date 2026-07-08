const fs = require('fs');
let code = fs.readFileSync('/home/mfalero/Projects/Personal/starship-architect/tests/system_validator.js', 'utf8');
code = code.replace('systems.forEach(sys => {', `
let oceanWorlds = [];
systems.forEach(s => {
    if(s.planets) s.planets.forEach(p => {
        if(p.type === 'Ocean World') oceanWorlds.push({atm: p.atmosphere, t: p.temperature, g: p.graph});
    });
});
console.log("Total Oceans generated: " + oceanWorlds.length);
console.log(oceanWorlds.slice(0, 5));
systems.forEach(sys => {
`);
fs.writeFileSync('/home/mfalero/Projects/Personal/starship-architect/tests/run_temp.js', code);
