function generateRivers() {
    if (!dggsData || !dggsData.metadata) return false;

    // Use a simple seeded PRNG to ensure rivers are identical for the same map seed
    let seedVal = 1337;
    if (dggsData.metadata.seed) {
        for (let i = 0; i < dggsData.metadata.seed.length; i++) seedVal += dggsData.metadata.seed.charCodeAt(i);
    }
    const random = () => {
        const x = Math.sin(seedVal++) * 10000;
        return x - Math.floor(x);
    };

    const rivers = [];

    // 1. Compute SPFA Dijkstra Distance to Sinks (Oceans or Local Minima)
    // This allows rivers to intelligently cross plateaus and even carve through small hills (uphill)
    // to reach the ocean, mimicking real-world river basin carving (like the Nile or Colorado).
    const distToOcean = new Int32Array(dggsData.cells.length).fill(999999);
    const inQueue = new Uint8Array(dggsData.cells.length).fill(0);
    let currentQueue = [];
