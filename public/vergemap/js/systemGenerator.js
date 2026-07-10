import * as THREE from 'three';

function makeRNG(seed) {
    // Generate a simple hash of a string seed if necessary
    if (typeof seed === 'string') {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
        }
        seed = hash;
    }
    let s = (seed * 2147483647) >>> 0;
    return () => {
        s = Math.imul(s, 1664525) + 1013904223 >>> 0;
        return s / 4294967296;
    };
}

function weightedChoice(rng, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
    return weights.length - 1;
}

function calculateGRAPH(surfaceGravity, tempC, atmStr, distance, starClass) {
    let g = 2;
    if (surfaceGravity < 0.2) g = 0;
    else if (surfaceGravity <= 0.8) g = 1;
    else if (surfaceGravity <= 1.2) g = 2;
    else if (surfaceGravity <= 2.0) g = 3;
    else if (surfaceGravity <= 4.0) g = 4;
    else g = 5;

    let h = 2;
    if (tempC <= -200) h = 0;
    else if (tempC <= -50) h = 1;
    else if (tempC <= 50) h = 2;
    else if (tempC <= 100) h = 3;
    else if (tempC <= 500) h = 4;
    else h = 5;

    let a = 2, p = 3;
    if (atmStr.includes("None") || atmStr.includes("Trace")) {
        a = 0; p = atmStr.includes("Trace") ? 1 : 0;
    } else if (atmStr.includes("Nitrogen/Oxygen (1 atm)")) {
        a = 2; p = 3;
    } else if (atmStr.includes("Nitrogen/Oxygen (Thick)")) {
        a = 2; p = 4;
    } else if (atmStr.includes("Carbon Dioxide") || atmStr.includes("Methane")) {
        a = 3; 
        p = atmStr.includes("Thin") ? 2 : (atmStr.includes("Thick") ? 4 : 3);
    } else if (atmStr.includes("Sulfur") || atmStr.includes("Silicate")) {
        a = 4; p = 4;
    } else if (atmStr.includes("Hydrogen/Helium")) {
        a = 1; p = 5; 
    } else {
        a = 2; p = 2;
    }

    let rBase = 2;
    if (starClass === 'O' || starClass === 'B') rBase = 4;
    else if (starClass === 'A' || starClass === 'F') rBase = 3;
    else if (starClass === 'G') rBase = 2;
    else rBase = 1; 
    
    let rDist = Math.max(0, Math.floor(rBase - Math.sqrt(distance) + 1));
    if (distance < 0.3) rDist += 2;
    else if (distance < 0.8) rDist += 1;
    
    let rMag = (surfaceGravity < 0.8) ? 1 : 0;
    let rAtm = (p <= 1) ? 1 : 0;
    
    let r = rDist + rMag + rAtm;
    r = Math.max(0, Math.min(5, r));

    return `G${g}/R${r}/A${a}/P${p}/H${h}`;
}

const STAR_TYPES = [
    { name: 'Yellow Dwarf', colorLow: 0x5a0a00, colorMid: 0xff3c00, colorHigh: 0xffffd2, color: 0xfffbe0, glowColor: 0xffee88, size: 0.48, intensity: 3.5 },
    { name: 'Red Dwarf', colorLow: 0x220000, colorMid: 0x881100, colorHigh: 0xff5533, color: 0xff7744, glowColor: 0xff5533, size: 0.30, intensity: 2.0 },
    { name: 'Blue Giant', colorLow: 0x001133, colorMid: 0x0055ff, colorHigh: 0xcceeff, color: 0xbbddff, glowColor: 0x88ccff, size: 0.70, intensity: 5.5 },
    { name: 'Orange Giant', colorLow: 0x550000, colorMid: 0xff5500, colorHigh: 0xffddaa, color: 0xff9944, glowColor: 0xff7722, size: 0.72, intensity: 3.8 },
    { name: 'White Dwarf', colorLow: 0x223344, colorMid: 0x88aacc, colorHigh: 0xffffff, color: 0xeeeeff, glowColor: 0xccddff, size: 0.22, intensity: 4.5 },
];

const starVS = `
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const starFS = `
    uniform float uTime;
    uniform vec3 uColorLow;
    uniform vec3 uColorMid;
    uniform vec3 uColorHigh;
    uniform vec3 uGlow;

    varying vec3 vPosition;
    varying vec3 vNormal;

    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

    float snoise(vec3 v){ 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 =   v - i + dot(i, C.xxx) ;

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1. + 3.0 * C.xxx;

      i = mod(i, 289.0 ); 
      vec4 p = permute( permute( permute( 
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      float n_ = 1.0/7.0;
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        float n = snoise(vPosition * 1.5 + uTime * 0.05);
        n += snoise(vPosition * 3.0 - uTime * 0.1) * 0.5;
        
        float brightness = n * 0.5 + 0.5;

        vec3 finalColor = mix(uColorLow, uColorMid, brightness);
        finalColor = mix(finalColor, uColorHigh, pow(brightness, 3.0));

        float dotProduct = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        float limb = pow(dotProduct, 0.8);
        finalColor *= limb;

        finalColor += uGlow * pow(1.0 - dotProduct, 4.0) * 0.4;

        gl_FragColor = vec4(finalColor * 2.0, 1.0);
    }
`;

const textureLoader = new THREE.TextureLoader();
const planetTextures = {
    molten: textureLoader.load('textures/molten.png'),
    rocky: textureLoader.load('textures/rocky.png'),
    ocean: textureLoader.load('textures/ocean.png'),
    desert: textureLoader.load('textures/desert.png'),
    gas: textureLoader.load('textures/gas.png'),
    ice: textureLoader.load('textures/ice.png'),
    terran: textureLoader.load('textures/terran.png'),
    ring: textureLoader.load('textures/ring.png'),
    asteroids: textureLoader.load('textures/asteroids.png'),
    eyeball: textureLoader.load('textures/eyeball.png'),
};

Object.values(planetTextures).forEach(t => {
    t.colorSpace = THREE.SRGBColorSpace;
});

const BODY_TYPES = [
    { name: 'Molten Rock', color: 0xdd4422, roughness: 0.55, metalness: 0.45, atmColor: 0xff5522, atmOpacity: 0.25, tex: 'molten' },
    { name: 'Rocky World', color: 0x997755, roughness: 0.90, metalness: 0.10, tex: 'rocky' },
    { name: 'Ocean World', color: 0x1155aa, roughness: 0.40, metalness: 0.10, atmColor: 0x55aaff, atmOpacity: 0.45, tex: 'ocean' },
    { name: 'Desert World', color: 0xcc9944, roughness: 0.90, metalness: 0.05, atmColor: 0xffcc88, atmOpacity: 0.35, tex: 'desert' },
    { name: 'Gas Giant', color: 0xcc8844, roughness: 0.30, metalness: 0.10, isGas: true, atmColor: 0xffddaa, atmOpacity: 0.3, tex: 'gas' },
    { name: 'Ice World', color: 0xaaccee, roughness: 0.50, metalness: 0.20, atmColor: 0xddffff, atmOpacity: 0.35, tex: 'ice' },
    { name: 'Terran World', color: 0x335588, roughness: 0.65, metalness: 0.15, atmColor: 0x66bbff, atmOpacity: 0.55, tex: 'terran' },
    { name: 'Eyeball World', color: 0x88bbcc, roughness: 0.70, metalness: 0.10, atmColor: 0x66bbff, atmOpacity: 0.35, tex: 'eyeball', isTidalLocked: true },
];

export function generateSystem(systemData, genMode = "Normal") {
    const isNewGeneration = !systemData.planets;
    let attempt = 0;
    const maxAttempts = 100;
    let group = null;

    while (attempt < maxAttempts) {
        attempt++;
        
        if (isNewGeneration && attempt > 1) {
            systemData.systemSeed = Math.random().toString(36).substring(2, 15);
            delete systemData.planets; 
        }
        
        group = generateSystemImpl(systemData, genMode);
        
        if (!isNewGeneration || genMode === "Normal") {
            break; 
        }
        
        let hasViable = false;
        let hasBarelyViable = false;
        
        if (systemData.planets) {
            systemData.planets.forEach(p => {
                if (p.type === "Natural Satellite") return;
                const temp = parseInt(p.temperature);
                const atm = p.atmosphere;
                
                // Perfect viability
                if (atm === "Nitrogen/Oxygen (1 atm)" && temp >= 250 && temp <= 350) {
                    hasViable = true;
                }
                // Barely viable / high tech required
                if (["Thin Carbon Dioxide", "Nitrogen/Oxygen (Thick)", "Ammonia/Methane (Thick)", "Thin Nitrogen/Methane"].includes(atm)) {
                    hasBarelyViable = true;
                }
                // Breathable but extreme temp
                if (atm === "Nitrogen/Oxygen (1 atm)" && (temp < 250 || temp > 350)) {
                    hasBarelyViable = true;
                }
            });
        }
        
        if (genMode === "Viable" && hasViable) break;
        if (genMode === "ViableHigh" && (hasViable || hasBarelyViable)) break;
    }
    
    return group;
}

function generateSystemImpl(systemData, genMode = "Normal") {
    const group = new THREE.Group();
    // Using star seed/id to reliably seed the RNG so it looks the same every time
    const seed = systemData.systemSeed || systemData.id || systemData.name || "DefaultSystem";
    const rng = makeRNG(seed);

    let starIdx = -1;
    if (systemData.class) {
        let expectedName = systemData.class;
        if (expectedName === 'O' || expectedName === 'B') expectedName = 'Blue Giant';
        else if (expectedName === 'A') expectedName = 'White Dwarf';
        else if (expectedName === 'F' || expectedName === 'G') expectedName = 'Yellow Dwarf';
        else if (expectedName === 'K') expectedName = 'Orange Giant';
        else if (expectedName === 'M') expectedName = 'Red Dwarf';
        
        starIdx = STAR_TYPES.findIndex(s => s.name === expectedName);
    }
    if (starIdx === -1) {
        starIdx = weightedChoice(rng, [3, 2, 1, 2, 1]);
    }
    const starType = STAR_TYPES[starIdx];

    const starGroup = new THREE.Group();
    group.add(starGroup);

    const isBinary = rng() > 0.9;
    
    let displayStarType = starType.name;

    const star1Geo = new THREE.IcosahedronGeometry(starType.size * 2, 15); // Scale up a bit for system view
    const cGlow = new THREE.Color(starType.glowColor);

    const uni1 = {
        uTime: { value: 0.0 },
        uColorLow: { value: new THREE.Color(starType.colorLow) },
        uColorMid: { value: new THREE.Color(starType.colorMid) },
        uColorHigh: { value: new THREE.Color(starType.colorHigh) },
        uGlow: { value: cGlow }
    };
    const star1Mat = new THREE.ShaderMaterial({
        uniforms: uni1,
        vertexShader: starVS,
        fragmentShader: starFS
    });

    const star1 = new THREE.Mesh(star1Geo, star1Mat);
    star1.userData = {
        type: 'Star',
        data: systemData,
        isSystemBody: true,
        isStar: true,
        name: systemData.name + (isBinary ? ' A' : ' Prime'),
        starTypeName: starType.name,
        color: starType.glowColor,
    };
    starGroup.add(star1);

    const interactableMeshes = [star1];
    star1.add(new THREE.PointLight(new THREE.Color(starType.color), starType.intensity, 350));

    const starUniforms = [uni1];

    if (isBinary) {
        const star2Type = STAR_TYPES[Math.floor(rng() * STAR_TYPES.length)];
        const s2Size = star2Type.size * (0.5 + rng() * 0.5) * 2;

        const star2Geo = new THREE.IcosahedronGeometry(s2Size, 15);
        const c2Glow = new THREE.Color(star2Type.glowColor);
        const uni2 = {
            uTime: { value: 0.0 },
            uColorLow: { value: new THREE.Color(star2Type.colorLow) },
            uColorMid: { value: new THREE.Color(star2Type.colorMid) },
            uColorHigh: { value: new THREE.Color(star2Type.colorHigh) },
            uGlow: { value: c2Glow }
        };
        const star2Mat = new THREE.ShaderMaterial({
            uniforms: uni2,
            vertexShader: starVS,
            fragmentShader: starFS
        });
        const star2 = new THREE.Mesh(star2Geo, star2Mat);
        star2.userData = {
            type: 'Star',
            data: systemData,
            isSystemBody: true,
            isStar: true,
            name: systemData.name + ' B',
            starTypeName: star2Type.name,
            color: star2Type.glowColor,
        };

        star2.add(new THREE.PointLight(new THREE.Color(star2Type.color), star2Type.intensity * 0.6, 350));

        const dist = (starType.size * 2) + s2Size + 1.0;
        star1.position.x = -dist * (s2Size / ((starType.size * 2) + s2Size));
        star2.position.x = dist * ((starType.size * 2) / ((starType.size * 2) + s2Size));

        starGroup.add(star2);
        interactableMeshes.push(star2);
        starUniforms.push(uni2);
        displayStarType = `Binary (${starType.name} / ${star2Type.name})`;
    }

    let bodyCount = Math.floor(rng() * 4) + 1 + Math.floor(rng() * 4) + 1; // 2-8
    
        const starMass = starType.intensity;
    let effectiveStarMass = starMass;
    if (isBinary) effectiveStarMass *= 1.8; // Second star adds heat

    // Calculate System Age based on Star Class
    let systemAge = 4.5; // default 4.5 Billion years
    if (starType.name.includes("Class O") || starType.name.includes("Class B")) systemAge = 0.01 + rng() * 0.1;
    else if (starType.name.includes("Class A")) systemAge = 0.1 + rng() * 1.0;
    else if (starType.name.includes("Class F")) systemAge = 1.0 + rng() * 2.0;
    else if (starType.name.includes("Class G")) systemAge = 3.0 + rng() * 4.0;
    else if (starType.name.includes("Class K")) systemAge = 4.0 + rng() * 8.0;
    else if (starType.name.includes("Class M")) systemAge = 5.0 + rng() * 10.0;
    
    systemData.age = systemAge.toFixed(2) + " Billion Years";

    let currentOrbitRadius = (starType.size * 2.0) + (starMass * 0.3) + (rng() * 0.5);
    
    if (isBinary) {
        currentOrbitRadius += 2.5;
        // Circumbinary Orbits: ~50% of binary systems host planets, usually large gas giants
        if (rng() > 0.5) {
            bodyCount = 0; 
        } else {
            bodyCount = Math.floor(rng() * 3) + 1; // 1-3 planets
        }
    }
    
    if (genMode.startsWith("Viable") && bodyCount < 2) {
        bodyCount = 2 + Math.floor(rng() * 2); // Ensure enough planets for viable
    }

    let forceViableIdx = -1;
    if (genMode.startsWith("Viable") && bodyCount > 0) {
        forceViableIdx = Math.floor(rng() * bodyCount);
    }

    const orbitBodies = [];
    let beltR = 0;

    for (let i = 0; i < bodyCount; i++) {
        const minDistance = 1.2;
        const spacingMultiplier = 0.5 + (i * 0.35);
        const randomOffset = 0.5 + (rng() * 1.5);

        // Estimate orbital radius to determine temperature-appropriate planet type
        let estA;
        if (i === forceViableIdx) {
            estA = 0.8711 * effectiveStarMass;
            if (estA <= currentOrbitRadius + 0.5) estA = currentOrbitRadius + 0.5 + rng() * 0.5;
            currentOrbitRadius = estA;
        } else {
            currentOrbitRadius += minDistance + (randomOffset * spacingMultiplier * (starMass * 0.3));
            if (i === 1 && bodyCount >= 3 && rng() > 0.4 && i !== forceViableIdx) {
                beltR = currentOrbitRadius + 1.5;
                currentOrbitRadius += 3.0; 
            }
            estA = currentOrbitRadius;
        }
        
        let estTemp = Math.floor(280 * Math.pow(effectiveStarMass, 0.5) / Math.sqrt(estA));

        // Determine Planet Type early
        let btIdx;
        if (i === forceViableIdx) {
            if (isBinary) {
                if (genMode === "Viable") {
                    const r = rng();
                    if (r > 0.3) btIdx = 6; // Terran (70%)
                    else if (r > 0.05) btIdx = 2; // Ocean (25%)
                    else btIdx = 3; // Desert (Terraformed) (5%)
                } else {
                    btIdx = rng() > 0.5 ? 3 : 6; // Desert (Tatooine) or Terran
                }
            } else {
                if (genMode === "Viable") {
                    const r = rng();
                    if (r > 0.4) btIdx = 6; // Terran (60%)
                    else if (r > 0.2) btIdx = 7; // Eyeball (20%)
                    else if (r > 0.05) btIdx = 2; // Ocean (15%)
                    else btIdx = rng() > 0.5 ? 3 : 1; // Desert or Rocky (Terraformed) (5%)
                } else {
                    btIdx = rng() > 0.5 ? 6 : 7; // Terran or Eyeball
                }
            }
        } else if (isBinary) {
            btIdx = rng() > 0.2 ? 5 : 4; 
        } else if (estTemp > 450) {
            btIdx = rng() > 0.5 ? 0 : 1; // Molten or Rocky
        } else if (estTemp < 200) {
            btIdx = rng() > 0.5 ? 5 : 4; // Ice or Gas Giant
        } else {
            // Habitable zone planets
            const r = rng();
            if (r < 0.2) btIdx = 4; // Gas Giant
            else if (r < 0.4) btIdx = 2; // Ocean
            else if (r < 0.6) btIdx = 3; // Desert
            else if (r < 0.8) btIdx = 6; // Terran
            else if (r < 0.9) btIdx = 7; // Eyeball
            else btIdx = 1; // Rocky
        }
        const bt = BODY_TYPES[btIdx];

        let a, e, inc, lan, aop, orbitSpeed, orbitAngle;

        // Co-Orbital Motion: Exceptionally rare for large planets (~1% for rocky, ~0.1% for gas)
        const coOrbitalChance = bt.isGas ? 0.999 : 0.99;
        if (i > 0 && rng() > coOrbitalChance) {
            const prev = orbitBodies[i - 1];
            a = prev.a;
            e = prev.e;
            inc = prev.inc;
            lan = prev.lan;
            aop = prev.aop;
            orbitSpeed = prev.orbitSpeed;
            // Place at L4 or L5
            const offsets = [Math.PI / 3, -Math.PI / 3];
            orbitAngle = prev.orbitAngle + offsets[Math.floor(rng() * offsets.length)];
        } else {
            a = estA; // Semi-major axis
            
            // Ultra-Eccentric Orbits: ~50% for solitary giants, rare for small worlds
            if (bt.isGas && bodyCount === 1) {
                e = rng() > 0.5 ? 0.2 + rng() * 0.6 : rng() * 0.1;
            } else if (bt.isGas) {
                e = rng() > 0.85 ? 0.2 + rng() * 0.4 : rng() * 0.1;
            } else {
                e = rng() * 0.05; // Small rocky planets maintain circular orbits
            }

            // Polar Orbits: ~10% of close-in giant planets
            if (bt.isGas && i === 0 && rng() > 0.9) {
                inc = (Math.PI / 2) + (rng() - 0.5) * 0.3; // Misalignment ~80 to 110 degrees
            } else {
                inc = (rng() - 0.5) * 0.18; // Standard flat disk
            }
            
            lan = rng() * Math.PI * 2;
            aop = rng() * Math.PI * 2;
            
            orbitSpeed = Math.sqrt(starMass / a) * (0.35 + rng() * 0.15) * 0.5;
            orbitAngle = rng() * Math.PI * 2;
        }

        const rotationSpeed = (0.2 + rng() * 0.5);

        const bodyRadius = bt.isGas ? 0.35 + rng() * 0.2 : 0.1 + rng() * 0.15;

        // Calculate Keplerian ellipse dimensions
        const b = a * Math.sqrt(1 - e * e); // semi-minor axis
        const c = a * e; // focal distance

        // Create the Orbit Pivot
        const orbitPivot = new THREE.Group();
        orbitPivot.rotation.order = 'ZXZ';
        orbitPivot.rotation.z = lan;
        orbitPivot.rotation.x = inc;
        orbitPivot.rotation.y = aop; // Applying Argument of Periapsis as Y-axis rotation relative to tilted plane
        group.add(orbitPivot);

        // Draw crisp 2D orbital line in the local X-Y plane of the pivot
        const curve = new THREE.EllipseCurve(-c, 0, a, b, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(128);
        const orbitLineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const orbitLineMat = new THREE.LineBasicMaterial({ color: 0x446688, transparent: true, opacity: 0.35 });
        const orbitLine = new THREE.LineLoop(orbitLineGeo, orbitLineMat);
        orbitPivot.add(orbitLine);

        const bodyGeo = new THREE.SphereGeometry(bodyRadius, 32, 32);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xffffff),
            map: planetTextures[bt.tex] || null,
            emissive: new THREE.Color(bt.color).multiplyScalar(0.04),
            emissiveIntensity: 0.3,
            roughness: bt.roughness, metalness: bt.metalness ?? 0.05,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
        const pName = `${systemData.name} ${romanNumerals[i] || (i + 1)}`;
        
        // Planet Physics & Stats Calculations
        const surfaceGravity = bt.isGas 
            ? (1.5 + rng() * 1.5).toFixed(2) // 1.5g to 3.0g for gas giants
            : (0.4 + rng() * 1.0).toFixed(2); // 0.4g to 1.4g for rocky

        let physicalRadius;
        if (bt.isGas) {
            physicalRadius = Math.round((4.0 + rng() * 8.0) * 6371);
        } else {
            const baseFactor = 0.2 + parseFloat(surfaceGravity) * 0.8;
            physicalRadius = Math.round(baseFactor * 6371 * (0.9 + rng() * 0.2));
        }

        // Basic blackbody temperature approx
        const baseTemp = 280; // Kelvin for Earth-like at 1 AU
        let surfaceTemp = Math.floor(baseTemp * Math.pow(effectiveStarMass, 0.5) / Math.sqrt(a));
        
        // Apply atmospheric effects (greenhouse, etc.) based on planet type
        if (bt.name === "Scorched World") surfaceTemp += 200 + rng() * 300;
        if (bt.name === "Ice World") surfaceTemp = Math.min(surfaceTemp, 220) - rng() * 100;
        if (bt.name === "Toxic World") surfaceTemp += 100 + rng() * 150; // Venus-like
        if (bt.name === "Ocean World") surfaceTemp = 270 + rng() * 50; // Maintained by water
        if (bt.isGas) surfaceTemp -= 50; // Cloud top temperature
        
        surfaceTemp = Math.max(surfaceTemp, 30); // Absolute minimum 30K

        // Orbital & Rotational Periods
        const yearDays = (365.25 * Math.sqrt(Math.pow(a, 3) / starMass)).toFixed(1);
        const axisTilt = (rng() > 0.9 ? rng() * 180 : rng() * 30).toFixed(1);
        
        let dayHours;
        if (bt.isTidalLocked) {
            dayHours = (yearDays * 24).toFixed(1); // Locked day is exactly one year
        } else if (bt.isGas) {
            dayHours = (9 + rng() * 6).toFixed(1); // Gas giants spin fast (9-15 hours)
        } else {
            dayHours = (12 + rng() * 40).toFixed(1); // Rocky planets (12-52 hours)
            if (rng() > 0.95) dayHours = ((rng() > 0.5 ? 1 : -1) * (100 + rng() * 5000)).toFixed(1); // Venus-like slow/retrograde
        }

        // Atmospheric Composition
        let atmosphere = "None";
        if (bt.isGas) {
            atmosphere = "Hydrogen/Helium (Extreme Pressure)";
        } else if (surfaceGravity < 0.6 && surfaceTemp > 350) {
            atmosphere = "Trace (Boiled Off)";
        } else if (bt.name === "Terran World" || bt.name === "Eyeball World") {
            atmosphere = "Nitrogen/Oxygen (1 atm)";
        } else if (bt.name === "Ocean World") {
            if (i === forceViableIdx && genMode === "Viable") {
                atmosphere = "Nitrogen/Oxygen (1 atm)";
            } else {
                const r = rng();
                if (r > 0.7) atmosphere = "Nitrogen/Oxygen (1 atm)"; // 30% chance for perfect Ocean atmosphere
                else if (r > 0.3) atmosphere = "Nitrogen/Oxygen (Thick)";
                else atmosphere = "Ammonia/Methane (Thick)";
            }
        } else if (bt.name === "Desert World") {
            if (i === forceViableIdx && genMode === "Viable") {
                atmosphere = "Nitrogen/Oxygen (1 atm)";
            } else {
                atmosphere = rng() > 0.7 ? "Nitrogen/Oxygen (1 atm)" : "Thin Carbon Dioxide"; // 30% chance for breathable arid world
            }
        } else if (bt.name === "Molten Rock") {
            atmosphere = "Silicate Vapor / Sulfur Dioxide";
        } else if (bt.name === "Ice World") {
            atmosphere = rng() > 0.5 ? "Thin Nitrogen/Methane" : "Trace Exosphere";
        } else if (bt.name === "Rocky World") {
            if (i === forceViableIdx && genMode === "Viable") {
                atmosphere = "Nitrogen/Oxygen (1 atm)";
            } else {
                atmosphere = rng() > 0.95 ? "Nitrogen/Oxygen (1 atm)" : (rng() > 0.5 ? "None" : "Trace Carbon Dioxide"); // 5% chance for breathable rocky anomaly
            }
        } else {
            atmosphere = "Variable / Standard";
        }

        const tempC = Math.floor(surfaceTemp - 273.15);
        let currentGraph = calculateGRAPH(surfaceGravity, tempC, atmosphere, a, systemData.class);

        let isTerraformed = false;
        let anomaliesText = "";
        let subtype = bt.name;
        let features = [];
        
        let match = currentGraph.match(/G(\d+)\/R(\d+)\/A(\d+)\/P(\d+)\/H(\d+)/);
        if (match) {
            let g = parseInt(match[1]);
            let r = parseInt(match[2]);
            let a_val = parseInt(match[3]);
            let p_val = parseInt(match[4]);
            let h = parseInt(match[5]);

            const isPerfect = (a_val === 2 && p_val === 3 && h === 2 && g === 2 && r <= 1);
            const isBarelyViable = (!isPerfect && g >= 1 && g <= 3 && r <= 3 && p_val <= 3 && h >= 1 && h <= 3);

            if (isBarelyViable && rng() < 0.05) {
                isTerraformed = true;
                const anomalies = [];
                if (g !== 2) { g += (g < 2 ? 1 : -1); anomalies.push("gravity"); }
                if (r > 0) { r -= 1; anomalies.push("magnetic field"); }
                if (a_val !== 2) { a_val += (a_val < 2 ? 1 : -1); anomalies.push("atmosphere"); }
                if (p_val !== 3) { p_val += (p_val < 3 ? 1 : -1); anomalies.push("pressure"); }
                if (h !== 2) { h += (h < 2 ? 1 : -1); anomalies.push("thermodynamics"); }

                currentGraph = `G${g}/R${r}/A${a_val}/P${p_val}/H${h}`;
                anomaliesText = anomalies.join(", ");
                features.push(rng() > 0.5 ? "Ancient Ruins" : "Precursor Artifacts");
            }
            
            // Subtype Logic
            if (bt.name === "Terran World") {
                if (a_val === 3) subtype = "Swamp World";
                else if (tempC > 30 && p_val >= 3) subtype = "Jungle World";
                else if (tempC < -5) subtype = "Tundra World";
            } else if (bt.name === "Ocean World") {
                if (a_val === 3 || a_val === 4) subtype = "Ammonia Ocean World";
                else if (tempC > 40) subtype = "Boiling Ocean World";
            } else if (bt.name === "Ice World") {
                if (p_val >= 2) subtype = "Glacial World";
            } else if (bt.name === "Desert World") {
                if (tempC > 50) subtype = "Scorched Desert";
                else if (p_val <= 1) subtype = "Barren Desert";
            }

            // Feature Logic
            // Biological features require a minimum temperature to sustain complex ecosystems globally
            if ((a_val === 2 || a_val === 3) && !bt.isGas && tempC > -30) {
                if (rng() > 0.85) features.push("Exotic Flora");
                
                // Bioluminescence makes sense on dark planets that are still warm enough for life
                const isDark = (p_val >= 4 || bt.isTidalLocked || (a > 2.0 && p_val >= 3));
                if (isDark && rng() > 0.6) features.push("Bioluminescent Ecosystem");
            }
            if (p_val >= 3 && (e > 0.2 || tempC > 40) && rng() > 0.7) {
                features.push("Extreme Weather");
            }
            if (a_val === 2 && g <= 2 && tempC > 5 && rng() > 0.85) {
                features.push("Megafauna");
            }
            if (r > 1 && rng() > 0.7 && !bt.isGas) {
                features.push("Radioactive Hotspots");
            }

            // Microenvironment Features (Life finds a way in harsh extremes)
            const isYoung = systemAge < 3.0;
            const isOld = systemAge > 8.0;

            if (tempC <= -30 && p_val > 0) {
                if (isYoung && rng() > 0.4) features.push("Thermal Vents");
                else if (!isOld && rng() > 0.75) features.push(rng() > 0.5 ? "Geothermal Oases" : "Subterranean Biosphere");
            }
            if (tempC >= 50 && p_val > 0 && rng() > 0.8) {
                features.push("Habitable Polar Regions");
            }
            if (p_val <= 1 && !bt.isGas && rng() > 0.85) {
                features.push("Crystalline Caverns");
            }
            if (isYoung && !bt.isGas && rng() > 0.7) {
                features.push("Active Volcanism");
            }
        }

        let desc = `A ${subtype.toLowerCase()} orbiting at ${a.toFixed(2)} AU. `;
        if (e > 0.2) desc += `Its highly eccentric orbit (e = ${e.toFixed(2)}) subjects it to extreme seasonal variations. `;
        if (bt.isTidalLocked) desc += "It is tidally locked, presenting only one face to its star. ";
        if (bt.isGas) desc += "Massive storms and high gravity make its atmosphere treacherous.";
        else if (isTerraformed && anomaliesText) {
            desc += `Anomalously, it possesses unnatural fluctuations in its ${anomaliesText}, suggesting ancient terraforming efforts. `;
        }
        else if (surfaceTemp > 350) desc += "The surface is blisteringly hot and hostile to life.";
        else if (surfaceTemp < 250) desc += "A frozen, desolate landscape dominates the surface.";
        else desc += "Conditions may be suitable for hardy ecosystems or outposts.";

        if (features.length > 0) {
            desc += ` Notable features include: ${features.join(", ")}.`;
        }

        if (!systemData.planets) systemData.planets = [];
        let pData = systemData.planets.find(p => p.originalName === pName);
        if (!pData) {
            pData = { originalName: pName, name: pName, description: desc };
            systemData.planets.push(pData);
        } else if (pData.type !== bt.name) {
            pData.description = desc;
        }

        pData.gravity = surfaceGravity + "g";
        pData.physicalRadius = physicalRadius;
        pData.temperature = Math.floor(surfaceTemp) + " K (" + tempC + "°C)";
        pData.atmosphere = atmosphere;
        pData.graph = currentGraph;
        if (isTerraformed) pData.anomalies = anomaliesText;
        pData.subtype = subtype;
        pData.features = features;

        pData.year = yearDays + " Earth Days";
        pData.day = dayHours + " Hours";
        pData.tilt = axisTilt + "°";
        pData.type = bt.name;
        pData.tex = bt.tex;

        body.userData = {
            type: 'Planet',
            data: pData,
            isSystemBody: true,
            name: pData.name,
            planetTypeName: bt.name,
            color: bt.color,
        };
        interactableMeshes.push(body);

        if (bt.isGas && rng() > 0.35) {
            const innerR = bodyRadius * 1.3;
            const outerR = bodyRadius * 3.2;
            const grGeo = new THREE.RingGeometry(innerR, outerR, 64);
            const grMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(bt.color).lerp(new THREE.Color(0xffffff), 0.6),
                map: planetTextures.ring,
                alphaMap: planetTextures.ring,
                transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false,
                blending: THREE.NormalBlending
            });
            const gr = new THREE.Mesh(grGeo, grMat);
            gr.rotation.x = Math.PI / 2 + (rng() - 0.5) * 0.4;
            body.add(gr);
        }

        body.userData.orbiters = [];
        if (!bt.isGas && rng() > 0.55 && i > 0) {
            const moonR = bodyRadius * 0.38;
            const moonDst = bodyRadius * 2.8;
            const moonGeo = new THREE.SphereGeometry(moonR, 16, 16);
            const moonMat = new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.95, metalness: 0.05, map: planetTextures.rocky });
            const moon = new THREE.Mesh(moonGeo, moonMat);
            const moonPivot = new THREE.Group();
            const moonInc = (rng() - 0.5) * 0.4;
            const moonLan = rng() * Math.PI * 2;
            moonPivot.rotation.order = 'ZXZ';
            moonPivot.rotation.z = moonLan;
            moonPivot.rotation.x = moonInc;
            
            // Moon orbital line
            const moonCurve = new THREE.EllipseCurve(0, 0, moonDst, moonDst, 0, 2 * Math.PI, false, 0);
            const mPts = moonCurve.getPoints(64);
            const mGeo = new THREE.BufferGeometry().setFromPoints(mPts);
            const mMat = new THREE.LineBasicMaterial({ color: 0x557799, transparent: true, opacity: 0.2 });
            const mLine = new THREE.LineLoop(mGeo, mMat);
            moonPivot.add(mLine);
            
            // Setup moon data
            const moonSpeed = (0.8 + rng() * 0.4) * (rng() > 0.5 ? 1 : -1);
            const moonAngle = rng() * Math.PI * 2;

            moon.position.set(Math.cos(moonAngle) * moonDst, Math.sin(moonAngle) * moonDst, 0);
            moonPivot.add(moon);
            body.add(moonPivot);
            // Moon physics
            const moonGravity = (0.05 + rng() * 0.15).toFixed(2); // 0.05g to 0.20g
            let moonTemp = Math.floor(baseTemp * Math.pow(starMass, 0.5) / Math.sqrt(a));
            moonTemp = Math.max(moonTemp - 30, 30); // Typically colder due to lack of atmosphere
            
            // Period in days: simplified approximation based on distance
            const moonYearDays = (1 + rng() * 30).toFixed(1);
            const moonTilt = (rng() * 5).toFixed(1);
            
            let moonAtmosphere = "None";
            if (moonGravity > 0.15 && moonTemp < 150) moonAtmosphere = "Thin Nitrogen/Methane";
            else if (moonGravity > 0.1) moonAtmosphere = "Trace Exosphere";

            let mDesc = `A small rocky natural satellite orbiting ${pName}. `;
            mDesc += "It is tidally locked to its parent planet. ";
            if (moonTemp < 200) mDesc += "Its surface is covered in impact craters and ancient ice.";
            else if (moonTemp > 350) mDesc += "The moon's surface is scorched by the nearby star.";
            else mDesc += "It's a desolate, airless rock drifting in the void.";

            // Find or create moon persistence data
            const mName = pName + "a";
            let mData = systemData.planets.find(p => p.originalName === mName);
            if (!mData) {
                mData = { originalName: mName, name: mName, description: mDesc };
                systemData.planets.push(mData);
            }
            
            const moonBaseFactor = 0.2 + parseFloat(moonGravity) * 0.8;
            const moonPhysicalRadius = Math.round(moonBaseFactor * 6371 * (0.9 + rng() * 0.2));
            mData.physicalRadius = moonPhysicalRadius;
            
            mData.gravity = moonGravity + "g";
            const moonTempC = Math.floor(moonTemp - 273.15);
            mData.temperature = Math.floor(moonTemp) + " K (" + moonTempC + "°C)";
            mData.atmosphere = moonAtmosphere;
            mData.graph = calculateGRAPH(parseFloat(moonGravity), moonTempC, moonAtmosphere, a, systemData.class);
            mData.year = moonYearDays + " Earth Days";
            mData.day = (moonYearDays * 24).toFixed(1) + " Hours (Tidally Locked)";
            mData.tilt = moonTilt + "°";
            mData.type = "Natural Satellite";
            mData.tex = "rocky";
            
            moon.userData = {
                type: 'Planet',
                data: mData,
                isSystemBody: true,
                isOrbiter: true,
                name: mData.name,
                planetTypeName: "Natural Satellite",
                color: 0x778899,
            };
            interactableMeshes.push(moon);
            body.userData.orbiters.push({ mesh: moon, dist: moonDst, angle: moonAngle, speed: moonSpeed });
        }

        if (bt.atmColor) {
            const atmGeo = new THREE.SphereGeometry(bodyRadius * 1.15, 32, 32);
            const atmMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(bt.atmColor),
                transparent: true, opacity: bt.atmOpacity,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide, depthWrite: false
            });
            body.add(new THREE.Mesh(atmGeo, atmMat));

            const outerGeo = new THREE.SphereGeometry(bodyRadius * 1.35, 16, 16);
            const outerMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(bt.atmColor),
                transparent: true, opacity: bt.atmOpacity * 0.35,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide, depthWrite: false
            });
            body.add(new THREE.Mesh(outerGeo, outerMat));
        }

        body.position.set(
            a * Math.cos(orbitAngle) - c,
            b * Math.sin(orbitAngle),
            0
        );
        orbitPivot.add(body);
        orbitBodies.push({ mesh: body, a, b, c, e, inc, lan, aop, orbitSpeed, orbitAngle, rotationSpeed, isTidalLocked: bt.isTidalLocked });
    }

    const beltMeshes = [];
    if (beltR > 0) {
        const particleCount1 = 1200;
        const positions1 = new Float32Array(particleCount1 * 3);
        const colors1 = new Float32Array(particleCount1 * 3);

        const color1 = new THREE.Color(0xa89988);
        const color2 = new THREE.Color(0x8c7c6c);
        const color3 = new THREE.Color(0x6e5e52);

        for (let j = 0; j < particleCount1; j++) {
            const rOffset = (rng() - 0.5) * 1.6;
            const r = beltR + rOffset;
            const theta = rng() * Math.PI * 2;
            
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            const z = (rng() - 0.5) * 0.25;

            positions1[j * 3] = x;
            positions1[j * 3 + 1] = y;
            positions1[j * 3 + 2] = z;

            let pColor = color1;
            const randColor = rng();
            if (randColor > 0.6) pColor = color2;
            else if (randColor > 0.3) pColor = color3;

            const shade = 0.8 + rng() * 0.4;
            colors1[j * 3] = pColor.r * shade;
            colors1[j * 3 + 1] = pColor.g * shade;
            colors1[j * 3 + 2] = pColor.b * shade;
        }

        const beltGeo1 = new THREE.BufferGeometry();
        beltGeo1.setAttribute('position', new THREE.BufferAttribute(positions1, 3));
        beltGeo1.setAttribute('color', new THREE.BufferAttribute(colors1, 3));

        const createCircleTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 16, 16);
            return new THREE.CanvasTexture(canvas);
        };

        const circleTexture = createCircleTexture();

        const beltMat1 = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            map: circleTexture
        });

        const beltPoints1 = new THREE.Points(beltGeo1, beltMat1);
        beltMeshes.push({ mesh: beltPoints1, speed: 0.005 });
        group.add(beltPoints1);

        const particleCount2 = 800;
        const positions2 = new Float32Array(particleCount2 * 3);
        const colors2 = new Float32Array(particleCount2 * 3);

        for (let j = 0; j < particleCount2; j++) {
            const rOffset = (rng() - 0.5) * 1.2;
            const r = beltR + rOffset;
            const theta = rng() * Math.PI * 2;
            
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            const z = (rng() - 0.5) * 0.15;

            positions2[j * 3] = x;
            positions2[j * 3 + 1] = y;
            positions2[j * 3 + 2] = z;

            let pColor = color1;
            const randColor = rng();
            if (randColor > 0.6) pColor = color2;
            else if (randColor > 0.3) pColor = color3;

            const shade = 0.8 + rng() * 0.4;
            colors2[j * 3] = pColor.r * shade;
            colors2[j * 3 + 1] = pColor.g * shade;
            colors2[j * 3 + 2] = pColor.b * shade;
        }

        const beltGeo2 = new THREE.BufferGeometry();
        beltGeo2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
        beltGeo2.setAttribute('color', new THREE.BufferAttribute(colors2, 3));

        const beltMat2 = new THREE.PointsMaterial({
            size: 0.10,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            map: circleTexture
        });

        const beltPoints2 = new THREE.Points(beltGeo2, beltMat2);
        beltMeshes.push({ mesh: beltPoints2, speed: 0.007 });
        group.add(beltPoints2);
    }

    group.userData = { orbitBodies, starType: { name: displayStarType }, bodyCount, interactableMeshes, starGroup, beltMeshes, starUniforms };
    return group;
}
