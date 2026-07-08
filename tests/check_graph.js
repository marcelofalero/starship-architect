const fs = require('fs');
const systems = JSON.parse(fs.readFileSync(__dirname + '/generated_systems.json'));
let count = 0;
for (let s of systems) {
    if (s.planets) {
        for (let p of s.planets) {
            if (p.graph) {
                console.log(p.type, "| Temp:", p.temperature, "| Atm:", p.atmosphere, "| GRAPH:", p.graph);
                count++;
                if (count > 20) process.exit(0);
            }
        }
    }
}
