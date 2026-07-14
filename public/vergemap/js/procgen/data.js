import * as THREE from 'three';

export const STAR_TYPES = [
    { name: 'Yellow Dwarf', colorLow: 0x5a0a00, colorMid: 0xff3c00, colorHigh: 0xffffd2, color: 0xfffbe0, glowColor: 0xffee88, size: 0.48, intensity: 3.5 },
    { name: 'Red Dwarf', colorLow: 0x220000, colorMid: 0x881100, colorHigh: 0xff5533, color: 0xff7744, glowColor: 0xff5533, size: 0.30, intensity: 2.0 },
    { name: 'Blue Giant', colorLow: 0x001133, colorMid: 0x0055ff, colorHigh: 0xcceeff, color: 0xbbddff, glowColor: 0x88ccff, size: 0.70, intensity: 5.5 },
    { name: 'Orange Giant', colorLow: 0x550000, colorMid: 0xff5500, colorHigh: 0xffddaa, color: 0xff9944, glowColor: 0xff7722, size: 0.72, intensity: 3.8 },
    { name: 'White Dwarf', colorLow: 0x223344, colorMid: 0x88aacc, colorHigh: 0xffffff, color: 0xeeeeff, glowColor: 0xccddff, size: 0.22, intensity: 4.5 },
];

const textureLoader = new THREE.TextureLoader();
export const planetTextures = {
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

export const BODY_TYPES = [
    { name: 'Molten Rock', color: 0xdd4422, roughness: 0.55, metalness: 0.45, atmColor: 0xff5522, atmOpacity: 0.25, tex: 'molten' },
    { name: 'Rocky World', color: 0x997755, roughness: 0.90, metalness: 0.10, tex: 'rocky' },
    { name: 'Ocean World', color: 0x1155aa, roughness: 0.40, metalness: 0.10, atmColor: 0x55aaff, atmOpacity: 0.45, tex: 'ocean' },
    { name: 'Desert World', color: 0xcc9944, roughness: 0.90, metalness: 0.05, atmColor: 0xffcc88, atmOpacity: 0.35, tex: 'desert' },
    { name: 'Gas Giant', color: 0xcc8844, roughness: 0.30, metalness: 0.10, isGas: true, atmColor: 0xffddaa, atmOpacity: 0.3, tex: 'gas' },
    { name: 'Ice World', color: 0xaaccee, roughness: 0.50, metalness: 0.20, atmColor: 0xddffff, atmOpacity: 0.35, tex: 'ice' },
    { name: 'Terran World', color: 0x335588, roughness: 0.65, metalness: 0.15, atmColor: 0x66bbff, atmOpacity: 0.55, tex: 'terran' },
    { name: 'Eyeball World', color: 0x88bbcc, roughness: 0.70, metalness: 0.10, atmColor: 0x66bbff, atmOpacity: 0.35, tex: 'eyeball', isTidalLocked: true },
];
