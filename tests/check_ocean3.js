const fs = require('fs');
let code = fs.readFileSync('/home/mfalero/Projects/Personal/starship-architect/tests/system_validator.js', 'utf8');
code = code.replace('systems.forEach(sys => {', `
let counts = {};
systems.forEach(s => {
    if(s.planets) s.planets.forEach(p => {
        if(p.type === 'Ocean World') {
            counts[p.atmosphere] = (counts[p.atmosphere] || 0) + 1;
        }
    });
});
console.log(counts);
systems.forEach(sys => {
`);
fs.writeFileSync('/home/mfalero/Projects/Personal/starship-architect/tests/run_temp2.js', code);
