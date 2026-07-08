const fs = require('fs');
let code = fs.readFileSync('/home/mfalero/Projects/Personal/starship-architect/tests/system_validator.js', 'utf8');
code = code.replace('systems.forEach(sys => {', `
let oceanCounts = {};
systems.forEach(s => {
    if(s.planets) s.planets.forEach(p => {
        if(p.type === 'Ocean World') {
            oceanCounts[p.atmosphere] = (oceanCounts[p.atmosphere] || 0) + 1;
        }
    });
});
console.log("Ocean Atmospheres:");
console.log(oceanCounts);
systems.forEach(sys => {
`);
fs.writeFileSync('/home/mfalero/Projects/Personal/starship-architect/tests/run_temp2.js', code);
