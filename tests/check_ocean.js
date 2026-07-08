const fs = require('fs');
const path = require('path');
const vm = require('vm');

let code = fs.readFileSync(path.join(__dirname, '../public/vergemap/js/systemGenerator.js'), 'utf-8');
code = code.replace(/import .*? from .*?;/g, '');
code = code.replace(/export function/g, 'function');

const sandbox = { Math, parseFloat, parseInt, console, THREE: { Group: class{constructor(){this.rotation={};this.position={set:()=>{}};this.add=()=>{};} add(){}}, Mesh: class{constructor(){this.userData={};this.position={set:()=>{}};this.add=()=>{};}}, SphereGeometry: class{}, IcosahedronGeometry: class{}, ShaderMaterial: class{}, BufferGeometry: class{setFromPoints(){return this;}}, RingGeometry: class{}, MeshStandardMaterial: class{}, MeshBasicMaterial: class{}, LineBasicMaterial: class{}, LineLoop: class{constructor(){this.position={set:()=>{}};this.rotation={};this.add=()=>{};}}, PointLight: class{}, Color: class{constructor(){this.r=1;this.g=1;this.b=1;} lerp(){return this;} multiplyScalar(){return this;}}, EllipseCurve: class{getPoints(){return [];}}, TextureLoader: class{load(){return {};}}, DoubleSide: 2, AdditiveBlending: 2, NormalBlending: 1, SRGBColorSpace: "srgb" }};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

let oceanCount = 0;
for(let i=0; i<1000; i++) {
  let sys = {id:'a'+i, name:'b'+i, class:'G', systemSeed:'s'+i};
  sandbox.generateSystem(sys, 'Normal');
  if (!sys.planets) continue;
  sys.planets.forEach(p => {
    if (p.type === 'Ocean World') {
      oceanCount++;
      console.log(p.type, "| Temp:", p.temperature, "| Atm:", p.atmosphere, "| GRAPH:", p.graph);
    }
  });
}
console.log("Total Oceans:", oceanCount);
