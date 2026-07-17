import * as THREE from 'three';
import { makeRNG, weightedChoice } from './math.js';
import { STAR_TYPES, BODY_TYPES, planetTextures } from './data.js';
import { calculateGRAPH } from './planets.js';
import { starVS, starFS } from './shaders.js';

export function generateSystem(systemData, genMode = "Normal", currentSystemTime = 0) {
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
        
        group = generateSystemImpl(systemData, genMode, currentSystemTime);
        
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

function generateSystemImpl(systemData, genMode = "Normal", currentSystemTime = 0) {
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
            orbitAngle = rng() * Math.PI * 2 + (orbitSpeed * currentSystemTime);
        }

        const rotationSpeed = (0.2 + rng() * 0.5);

        const bodyRadius = bt.isGas ? 0.7 + rng() * 0.4 : 0.2 + rng() * 0.3;

        // Calculate Keplerian ellipse dimensions
        const b = a * Math.sqrt(1 - e * e); // semi-minor axis
        const c = a * e; // focal distance

        // Create the Orbit Pivot
        const orbitPivot = new THREE.Group();
        const qLAN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), lan);
        const qInc = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        const qAoP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), aop);
        orbitPivot.quaternion.multiplyQuaternions(qLAN, qInc).multiply(qAoP);
        group.add(orbitPivot);

        // Draw crisp 2D orbital line in the local X-Y plane of the pivot
        const curve = new THREE.EllipseCurve(-c, 0, a, b, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(128);
        const orbitLineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const orbitLineMat = new THREE.LineBasicMaterial({ color: 0x446688, transparent: true, opacity: 0.35 });
        const orbitLine = new THREE.LineLoop(orbitLineGeo, orbitLineMat);
        orbitPivot.add(orbitLine);

        const bodyGeo = new THREE.SphereGeometry(bodyRadius, 32, 32);
        bodyGeo.rotateX(Math.PI / 2);
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
            pData = { 
                originalName: pName, 
                name: pName, 
                description: desc,
                planetaryId: (systemData.name + '-' + pName).replace(/[^a-z0-9]/gi, '-').toLowerCase()
            };
            systemData.planets.push(pData);
        } else if (pData.type !== bt.name) {
            pData.description = desc;
        }

        pData.gravity = surfaceGravity + "g";
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
        
        body.rotation.x = axisTilt * Math.PI / 180;
        if (!bt.isTidalLocked) {
            body.rotation.z = rotationSpeed * currentSystemTime;
        }
        
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
            body.add(gr);
        }

        body.userData.orbiters = [];
        const moonChance = bt.isGas ? 0.8 : 0.45;
        if (rng() < moonChance && i > 0) {
            const moonR = bt.isGas ? (bodyRadius * (0.1 + rng() * 0.15)) : (bodyRadius * 0.45);
            const moonDst = bodyRadius * (bt.isGas ? 1.5 : 2.8);
            const moonGeo = new THREE.SphereGeometry(moonR, 16, 16);
            moonGeo.rotateX(Math.PI / 2);
            const moonMat = new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.95, metalness: 0.05, map: planetTextures.rocky });
            const moon = new THREE.Mesh(moonGeo, moonMat);
            const moonPivot = new THREE.Group();
            const moonInc = (rng() - 0.5) * 0.4;
            const moonLan = rng() * Math.PI * 2;
            const moonQ_LAN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), moonLan);
            const moonQ_Inc = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), moonInc);
            moonPivot.quaternion.multiplyQuaternions(moonQ_LAN, moonQ_Inc);
            
            // Moon orbital line
            const moonCurve = new THREE.EllipseCurve(0, 0, moonDst, moonDst, 0, 2 * Math.PI, false, 0);
            const mPts = moonCurve.getPoints(64);
            const mGeo = new THREE.BufferGeometry().setFromPoints(mPts);
            const mMat = new THREE.LineBasicMaterial({ color: 0x557799, transparent: true, opacity: 0.2 });
            const mLine = new THREE.LineLoop(mGeo, mMat);
            moonPivot.add(mLine);
            
            // Setup moon data
            const moonSpeed = (0.8 + rng() * 0.4) * (rng() > 0.5 ? 1 : -1);
            const moonAngle = rng() * Math.PI * 2 + (moonSpeed * currentSystemTime);

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
                mData = { 
                    originalName: mName, 
                    name: mName, 
                    description: mDesc,
                    planetaryId: (systemData.name + '-' + mName).replace(/[^a-z0-9]/gi, '-').toLowerCase()
                };
                systemData.planets.push(mData);
            }
            
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
        beltPoints1.rotation.z = -0.005 * currentSystemTime;
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
        beltPoints2.rotation.z = -0.007 * currentSystemTime;
        beltMeshes.push({ mesh: beltPoints2, speed: 0.007 });
        group.add(beltPoints2);
    }

    group.userData = { orbitBodies, starType: { name: displayStarType }, bodyCount, interactableMeshes, starGroup, beltMeshes, starUniforms };
    return group;
}
