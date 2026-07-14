use crate::models::Tile;

pub struct Rng {
    state: u32,
}

impl Rng {
    pub fn new(seed_str: &str) -> Self {
        let mut hash: i32 = 0;
        for c in seed_str.chars() {
            hash = (31i32.wrapping_mul(hash)).wrapping_add(c as i32);
        }
        Self {
            state: hash as u32,
        }
    }

    pub fn next(&mut self) -> f64 {
        self.state = self.state.wrapping_add(0x6D2B79F5);
        let mut z = self.state;
        z = (z ^ (z >> 15)).wrapping_mul(z | 1);
        z ^= z.wrapping_add((z ^ (z >> 7)).wrapping_mul(z | 61));
        ((z ^ (z >> 14)) as f64) / 4294967296.0
    }
}

pub fn generate_tiles(seed: &str, planet_type: &str, radius: i32) -> Vec<Tile> {
    let w = 2 * radius + 1;
    let h = 2 * radius + 1;
    let mut tiles = Vec::with_capacity((w * h) as usize);

    for y in 0..h {
        for x in 0..w {
            let q = x - radius;
            let r = y - radius;
            let is_inside = q.abs() <= radius && r.abs() <= radius && (-q - r).abs() <= radius;

            if !is_inside {
                tiles.push(Tile {
                    biome: 0,
                    elevation: 0,
                    moisture: 0,
                    faction: 0,
                    feature: 0,
                    settlement: 0,
                    specialization: 0,
                    subsurface: false,
                });
                continue;
            }

            let mut tile_rng = Rng::new(&format!("{}-{}-{}-{}", seed, planet_type, x, y));
            let n1 = tile_rng.next();
            let n2 = tile_rng.next();
            let n3 = tile_rng.next();

            let mut biome = 0;
            let mut elevation = 0;
            let mut moisture = 0;
            let mut faction = 0;
            let mut feature = 0;

            match planet_type {
                "desert" => {
                    elevation = ((n1 * 4.0) as u8) + 2;
                    moisture = (n2 * 2.0) as u8;
                    if n3 < 0.05 {
                        biome = 13;
                    } else if n3 < 0.2 {
                        biome = 11;
                        elevation = 6;
                    } else {
                        biome = 2;
                    }
                }
                "ocean" => {
                    elevation = (n1 * 3.0) as u8;
                    moisture = ((n2 * 2.0) as u8) + 6;
                    if elevation == 2 && n3 < 0.1 {
                        biome = 3;
                        elevation = 3;
                    } else if elevation == 2 {
                        biome = 1;
                    } else {
                        biome = 0;
                    }
                }
                "ice" | "frozen" => {
                    elevation = ((n1 * 5.0) as u8) + 1;
                    moisture = ((n2 * 4.0) as u8) + 2;
                    biome = if n3 < 0.3 { 8 } else { 7 };
                }
                "volcanic" => {
                    elevation = ((n1 * 4.0) as u8) + 4;
                    moisture = (n2 * 2.0) as u8;
                    biome = if n3 < 0.2 { 9 } else { 10 };
                }
                "barren" => {
                    elevation = ((n1 * 5.0) as u8) + 2;
                    moisture = 0;
                    biome = 10;
                }
                _ => { // terrestrial
                    elevation = ((n1 * 5.0) as u8) + 2;
                    moisture = ((n2 * 5.0) as u8) + 2;
                    if elevation <= 2 {
                        biome = 0;
                    } else if elevation == 3 {
                        biome = 3;
                    } else if elevation <= 5 {
                        biome = 4;
                    } else {
                        biome = 11;
                    }
                }
            }

            let mut feature = 0;
            let mut settlement = 0;
            let mut specialization = 0;

            if tile_rng.next() < 0.15 {
                faction = ((tile_rng.next() * 63.0) as u8) + 1;
            }
            if tile_rng.next() < 0.08 {
                feature = ((tile_rng.next() * 31.0) as u8) + 1;
            }
            if tile_rng.next() < 0.10 {
                settlement = ((tile_rng.next() * 7.0) as u8) + 1;
                specialization = ((tile_rng.next() * 15.0) as u8) + 1; // 1-15 Specializations
            }

            let subsurface = if feature > 0 || settlement > 0 { tile_rng.next() < 0.1 } else { false };

            tiles.push(Tile {
                biome,
                elevation,
                moisture,
                faction,
                feature,
                settlement,
                specialization,
                subsurface,
            });
        }
    }

    tiles
}
