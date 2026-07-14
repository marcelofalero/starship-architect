export function calculateGRAPH(surfaceGravity, tempC, atmStr, distance, starClass) {
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
