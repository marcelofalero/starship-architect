export function makeRNG(seed) {
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

export function weightedChoice(rng, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return weights.length - 1;
}
