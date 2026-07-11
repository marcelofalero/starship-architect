use crate::{Tile, pack_tile};
use std::collections::HashMap;

#[derive(Clone, Copy, Debug)]
pub struct V3 { pub x: f64, pub y: f64, pub z: f64 }

impl V3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self { Self { x, y, z } }
    pub fn normalize(self) -> Self {
        let len = (self.x*self.x + self.y*self.y + self.z*self.z).sqrt();
        if len == 0.0 { return self; }
        Self { x: self.x/len, y: self.y/len, z: self.z/len }
    }
    pub fn dot(self, o: Self) -> f64 { self.x*o.x + self.y*o.y + self.z*o.z }
    pub fn cross(self, o: Self) -> Self {
        Self { x: self.y*o.z - self.z*o.y, y: self.z*o.x - self.x*o.z, z: self.x*o.y - self.y*o.x }
    }
    pub fn sub(self, o: Self) -> Self { Self { x: self.x-o.x, y: self.y-o.y, z: self.z-o.z } }
    pub fn add(self, o: Self) -> Self { Self { x: self.x+o.x, y: self.y+o.y, z: self.z+o.z } }
    pub fn scale(self, s: f64) -> Self { Self { x: self.x*s, y: self.y*s, z: self.z*s } }
}

/// A single DGGS cell: center position, polygon boundary vertices, and tile data.
pub struct DGGSCell {
    pub center: V3,
    pub vertices: Vec<V3>,  // 5 or 6 boundary vertices
    pub tile: Tile,
}

/// Result of DGGS generation
pub struct DGGSGrid {
    pub resolution: u8,
    pub cells: Vec<DGGSCell>,
    pub neighbors: Vec<Vec<u32>>,
    pub addresses: Vec<String>,
    pub rivers: Vec<Vec<u32>>,
}

fn generate_rivers(cells: &[DGGSCell], neighbors: &[Vec<u32>]) -> Vec<Vec<u32>> {
    let mut rivers = Vec::new();
    
    // Find candidate sources: high elevation and moisture (excluding polar/ice areas)
    let mut candidates = Vec::new();
    for i in 0..cells.len() {
        let cell = &cells[i];
        let abs_lat = cell.center.y.asin().abs();
        if abs_lat < 1.15 && cell.tile.biome != 7 && cell.tile.biome != 10 {
            if cell.tile.elevation >= 6 && cell.tile.moisture >= 3 {
                candidates.push((i, cell.tile.elevation, cell.tile.moisture));
            }
        }
    }
    
    // Sort candidates: highest elevation first, then highest moisture
    candidates.sort_by(|a, b| {
        b.1.cmp(&a.1).then_with(|| b.2.cmp(&a.2))
    });
    
    // Select sources that are spaced apart
    let mut sources = Vec::new();
    for &(idx, _, _) in &candidates {
        let mut too_close = false;
        for &s in &sources {
            if is_near(idx, s, neighbors, 3) {
                too_close = true;
                break;
            }
        }
        if !too_close {
            sources.push(idx);
            if sources.len() >= 12 {
                break;
            }
        }
    }
    
    // Trace path for each source
    for start in sources {
        let mut path = Vec::new();
        let mut curr = start;
        path.push(curr as u32);
        
        let mut local_visited = vec![false; cells.len()];
        local_visited[curr] = true;
        
        loop {
            let mut best_next = None;
            let mut min_el = u8::MAX;
            
            for &neigh_u32 in &neighbors[curr] {
                let neigh = neigh_u32 as usize;
                let neigh_abs_lat = cells[neigh].center.y.asin().abs();
                if !local_visited[neigh] && neigh_abs_lat < 1.15 && cells[neigh].tile.biome != 7 && cells[neigh].tile.biome != 10 {
                    let el = cells[neigh].tile.elevation;
                    if el < min_el {
                        min_el = el;
                        best_next = Some(neigh);
                    }
                }
            }
            
            if let Some(next) = best_next {
                curr = next;
                path.push(curr as u32);
                local_visited[curr] = true;
                
                if cells[curr].tile.elevation <= 3 {
                    break;
                }
            } else {
                break;
            }
        }
        
        if path.len() >= 4 {
            rivers.push(path);
        }
    }
    
    rivers
}

fn is_near(a: usize, b: usize, neighbors: &[Vec<u32>], steps: usize) -> bool {
    if a == b { return true; }
    if steps == 0 { return false; }
    
    let mut current_level = vec![a];
    let mut visited = vec![false; neighbors.len()];
    visited[a] = true;
    
    for _ in 0..steps {
        let mut next_level = Vec::new();
        for &curr in &current_level {
            for &neigh in &neighbors[curr] {
                let neigh = neigh as usize;
                if neigh == b {
                    return true;
                }
                if !visited[neigh] {
                    visited[neigh] = true;
                    next_level.push(neigh);
                }
            }
        }
        current_level = next_level;
    }
    
    false
}

/// Generate a DGGS grid at the given resolution using icosahedral subdivision.
pub fn generate_dggs(seed: &str, planet_type: &str, resolution: u8) -> DGGSGrid {
    // Step 1: Build icosphere
    let (verts, faces, face_paths) = build_icosphere(resolution as usize);

    // Step 2: Compute dual (Goldberg polyhedron) - each vertex becomes a cell
    let cells_raw = compute_dual(&verts, &faces);

    // Step 3: Assign tile data to each cell based on its spherical position
    let cells: Vec<DGGSCell> = cells_raw.into_iter().enumerate().map(|(i, (center, boundary))| {
        let tile = generate_tile_for_position(seed, planet_type, center, i);
        DGGSCell { center, vertices: boundary, tile }
    }).collect();

    // Step 4: Compute adjacency graph (neighbors)
    let n = verts.len();
    let mut cell_neighbors = vec![Vec::new(); n];
    for face in &faces {
        let a = face[0];
        let b = face[1];
        let c = face[2];
        for &(u, v) in &[(a, b), (b, c), (c, a)] {
            cell_neighbors[u].push(v as u32);
            cell_neighbors[v].push(u as u32);
        }
    }
    for list in cell_neighbors.iter_mut() {
        list.sort_unstable();
        list.dedup();
    }

    // Step 5: Compute hierarchical addresses
    let mut vert_faces: Vec<Vec<usize>> = vec![Vec::new(); n];
    for (fi, face) in faces.iter().enumerate() {
        vert_faces[face[0]].push(fi);
        vert_faces[face[1]].push(fi);
        vert_faces[face[2]].push(fi);
    }

    let mut addresses = Vec::with_capacity(n);
    for vi in 0..n {
        let adj_faces = &vert_faces[vi];
        let mut best_path: Option<&Vec<u8>> = None;
        let mut best_corner = 0;
        for &fi in adj_faces {
            let path = &face_paths[fi];
            let face = &faces[fi];
            let corner = if face[0] == vi {
                0
            } else if face[1] == vi {
                1
            } else {
                2
            };
            if best_path.is_none() || path < best_path.unwrap() {
                best_path = Some(path);
                best_corner = corner;
            }
        }
        
        let path = best_path.unwrap();
        let base_face = path[0];
        let mut digits = String::new();
        for &d in &path[1..] {
            digits.push_str(&d.to_string());
        }
        let address = format!("{}-{}-{}", base_face, digits, best_corner);
        addresses.push(address);
    }

    let rivers = generate_rivers(&cells, &cell_neighbors);

    DGGSGrid { resolution, cells, neighbors: cell_neighbors, addresses, rivers }
}

/// Build a subdivided icosphere. Returns (vertices, triangle_faces, face_paths).
fn build_icosphere(resolution: usize) -> (Vec<V3>, Vec<[usize; 3]>, Vec<Vec<u8>>) {
    let phi = (1.0 + 5.0_f64.sqrt()) / 2.0;

    let mut verts: Vec<V3> = vec![
        V3::new(-1.0,  phi, 0.0).normalize(),
        V3::new( 1.0,  phi, 0.0).normalize(),
        V3::new(-1.0, -phi, 0.0).normalize(),
        V3::new( 1.0, -phi, 0.0).normalize(),
        V3::new(0.0, -1.0,  phi).normalize(),
        V3::new(0.0,  1.0,  phi).normalize(),
        V3::new(0.0, -1.0, -phi).normalize(),
        V3::new(0.0,  1.0, -phi).normalize(),
        V3::new( phi, 0.0, -1.0).normalize(),
        V3::new( phi, 0.0,  1.0).normalize(),
        V3::new(-phi, 0.0, -1.0).normalize(),
        V3::new(-phi, 0.0,  1.0).normalize(),
    ];

    let mut faces: Vec<[usize; 3]> = vec![
        [0,11,5],  [0,5,1],   [0,1,7],   [0,7,10],  [0,10,11],
        [1,5,9],   [5,11,4],  [11,10,2],  [10,7,6],  [7,1,8],
        [3,9,4],   [3,4,2],   [3,2,6],    [3,6,8],   [3,8,9],
        [4,9,5],   [2,4,11],  [6,2,10],   [8,6,7],   [9,8,1],
    ];
    let mut face_paths: Vec<Vec<u8>> = (0..20).map(|i| vec![i as u8]).collect();

    // Subdivide
    for _ in 0..resolution {
        let mut new_faces = Vec::with_capacity(faces.len() * 4);
        let mut new_paths = Vec::with_capacity(faces.len() * 4);
        let mut midpoint_cache: HashMap<(usize, usize), usize> = HashMap::new();

        for (fi, face) in faces.iter().enumerate() {
            let path = &face_paths[fi];
            let a = face[0]; let b = face[1]; let c = face[2];
            let ab = get_midpoint(&mut verts, &mut midpoint_cache, a, b);
            let bc = get_midpoint(&mut verts, &mut midpoint_cache, b, c);
            let ca = get_midpoint(&mut verts, &mut midpoint_cache, c, a);
            
            // Child 0: [a, ab, ca]
            new_faces.push([a, ab, ca]);
            let mut p0 = path.clone();
            p0.push(0);
            new_paths.push(p0);

            // Child 1: [b, bc, ab]
            new_faces.push([b, bc, ab]);
            let mut p1 = path.clone();
            p1.push(1);
            new_paths.push(p1);

            // Child 2: [c, ca, bc]
            new_faces.push([c, ca, bc]);
            let mut p2 = path.clone();
            p2.push(2);
            new_paths.push(p2);

            // Child 3: [ab, bc, ca]
            new_faces.push([ab, bc, ca]);
            let mut p3 = path.clone();
            p3.push(3);
            new_paths.push(p3);
        }
        faces = new_faces;
        face_paths = new_paths;
    }

    (verts, faces, face_paths)
}

fn get_midpoint(verts: &mut Vec<V3>, cache: &mut HashMap<(usize, usize), usize>, a: usize, b: usize) -> usize {
    let key = if a < b { (a, b) } else { (b, a) };
    if let Some(&idx) = cache.get(&key) { return idx; }
    let mid = V3::new(
        (verts[a].x + verts[b].x) / 2.0,
        (verts[a].y + verts[b].y) / 2.0,
        (verts[a].z + verts[b].z) / 2.0,
    ).normalize();
    let idx = verts.len();
    verts.push(mid);
    cache.insert(key, idx);
    idx
}

/// Compute the dual of the triangulation. Each vertex becomes a cell.
/// Returns Vec of (center, ordered_boundary_vertices).
fn compute_dual(verts: &[V3], faces: &[[usize; 3]]) -> Vec<(V3, Vec<V3>)> {
    let n = verts.len();

    // For each vertex, collect indices of faces that contain it
    let mut vert_faces: Vec<Vec<usize>> = vec![Vec::new(); n];
    for (fi, face) in faces.iter().enumerate() {
        vert_faces[face[0]].push(fi);
        vert_faces[face[1]].push(fi);
        vert_faces[face[2]].push(fi);
    }

    // Precompute face centroids (projected onto unit sphere)
    let centroids: Vec<V3> = faces.iter().map(|f| {
        V3::new(
            (verts[f[0]].x + verts[f[1]].x + verts[f[2]].x) / 3.0,
            (verts[f[0]].y + verts[f[1]].y + verts[f[2]].y) / 3.0,
            (verts[f[0]].z + verts[f[1]].z + verts[f[2]].z) / 3.0,
        ).normalize()
    }).collect();

    // For each vertex, order its adjacent face centroids around it
    let mut cells = Vec::with_capacity(n);
    for vi in 0..n {
        let center = verts[vi];
        let adj = &vert_faces[vi];
        let mut ordered_centroids: Vec<V3> = adj.iter().map(|&fi| centroids[fi]).collect();

        // Sort centroids around vertex using tangent-plane angle
        sort_around_vertex(center, &mut ordered_centroids);

        cells.push((center, ordered_centroids));
    }

    cells
}

/// Sort points around a vertex on the sphere by angle in the tangent plane.
fn sort_around_vertex(vertex: V3, points: &mut Vec<V3>) {
    // Build orthonormal tangent frame
    let n = vertex; // normal = vertex (unit sphere)
    let up = if n.y.abs() < 0.9 { V3::new(0.0, 1.0, 0.0) } else { V3::new(1.0, 0.0, 0.0) };
    let t1 = n.cross(up).normalize();
    let t2 = n.cross(t1).normalize();

    points.sort_by(|a, b| {
        let da = a.sub(vertex);
        let angle_a = f64::atan2(da.dot(t2), da.dot(t1));
        let db = b.sub(vertex);
        let angle_b = f64::atan2(db.dot(t2), db.dot(t1));
        angle_a.partial_cmp(&angle_b).unwrap_or(std::cmp::Ordering::Equal)
    });
}

fn hash3d(x: i32, y: i32, z: i32, seed_hash: u32) -> f64 {
    let mut h = seed_hash ^ (x as u32).wrapping_mul(374761393);
    h = (h ^ (y as u32).wrapping_mul(668265263)).rotate_left(13);
    h = (h ^ (z as u32).wrapping_mul(1234567891)).wrapping_mul(0x6D2B79F5);
    h = h ^ (h >> 15);
    (h as f64) / 4294967296.0
}

fn value_noise3d(x: f64, y: f64, z: f64, seed_hash: u32) -> f64 {
    let x0 = x.floor() as i32;
    let y0 = y.floor() as i32;
    let z0 = z.floor() as i32;

    let x1 = x0 + 1;
    let y1 = y0 + 1;
    let z1 = z0 + 1;

    let tx = x - x.floor();
    let ty = y - y.floor();
    let tz = z - z.floor();

    let sx = tx * tx * (3.0 - 2.0 * tx);
    let sy = ty * ty * (3.0 - 2.0 * ty);
    let sz = tz * tz * (3.0 - 2.0 * tz);

    let c000 = hash3d(x0, y0, z0, seed_hash);
    let c100 = hash3d(x1, y0, z0, seed_hash);
    let c010 = hash3d(x0, y1, z0, seed_hash);
    let c110 = hash3d(x1, y1, z0, seed_hash);
    let c001 = hash3d(x0, y0, z1, seed_hash);
    let c101 = hash3d(x1, y0, z1, seed_hash);
    let c011 = hash3d(x0, y1, z1, seed_hash);
    let c111 = hash3d(x1, y1, z1, seed_hash);

    let c00 = c000 * (1.0 - sx) + c100 * sx;
    let c10 = c010 * (1.0 - sx) + c110 * sx;
    let c01 = c001 * (1.0 - sx) + c101 * sx;
    let c11 = c011 * (1.0 - sx) + c111 * sx;

    let c0 = c00 * (1.0 - sy) + c10 * sy;
    let c1 = c01 * (1.0 - sy) + c11 * sy;

    c0 * (1.0 - sz) + c1 * sz
}

fn fbm3d(pos: V3, octaves: usize, seed_hash: u32) -> f64 {
    let mut value = 0.0;
    let mut amplitude = 1.0;
    let mut frequency = 1.0;
    let mut max_value = 0.0;

    for _ in 0..octaves {
        value += amplitude * value_noise3d(pos.x * frequency, pos.y * frequency, pos.z * frequency, seed_hash);
        max_value += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    value / max_value
}

fn resolve_whittaker_biome(planet_type: &str, elevation: u8, moisture: u8, temp: u8, local_noise: f64) -> u8 {
    // Volcanic planet overrides
    if planet_type == "volcanic" {
        if elevation <= 3 {
            return 11; // Magma/Lava oceans are Volcanic
        }
        if elevation >= 6 {
            return 11; // Volcanic Peak
        }
        if local_noise < 0.3 {
            return 10; // Mountain (Basalt rock)
        }
        return 11; // Volcanic plains
    }

    // Barren planet overrides
    if planet_type == "barren" {
        if elevation >= 6 {
            return 10; // Mountain peaks
        }
        if local_noise < 0.4 {
            return 10; // Mountainous barren rock
        }
        return 3; // Desert (barren dry plains)
    }

    // Ice planet overrides
    if planet_type == "ice" || planet_type == "frozen" {
        if elevation <= 3 {
            return 9; // Frozen ocean / Ice Cap
        }
        if elevation >= 6 {
            return 9; // Glacial peaks / Ice Cap
        }
        if local_noise < 0.3 {
            return 8; // Tundra
        }
        return 9; // Ice Cap
    }

    // Desert planet overrides
    if planet_type == "desert" {
        if elevation <= 3 {
            return 3; // Desert basins (sand dunes / dry lakes)
        }
        if elevation >= 6 {
            return 10; // Mountain
        }
        return 3; // Desert
    }

    // 1. Water biomes
    if elevation <= 2 {
        if temp == 0 {
            return 9; // Ice Cap (Sea Ice)
        }
        return 0; // Deep Ocean
    }
    if elevation == 3 {
        if temp == 0 {
            return 9; // Ice Cap (Sea Ice)
        }
        return 1; // Ocean
    }
    
    // 2. Mountain peaks (impassable/high)
    if elevation >= 6 {
        if temp <= 1 {
            return 9; // Glacial Peak (Ice Cap)
        }
        return 10; // Mountain
    }
    
    // 3. Land biomes based on Whittaker: Temperature (0..7) vs Moisture (0..7)
    if temp == 0 {
        return 9; // Ice Cap
    }
    if temp == 1 {
        return 8; // Tundra
    }
    
    // Cool/Cold temperatures (temp 2)
    if temp == 2 {
        if moisture <= 2 {
            return 8; // Tundra
        } else {
            return 7; // Taiga
        }
    }
    
    // Moderate temperatures (temp 3 or 4)
    if temp <= 4 {
        if moisture <= 1 {
            return 3; // Desert (Cold Desert)
        } else if moisture <= 3 {
            return 5; // Grassland
        } else if moisture <= 5 {
            return 6; // Forest
        } else {
            return 12; // Swamp
        }
    }
    
    // Warm/Hot temperatures (temp >= 5)
    if moisture <= 1 {
        return 3; // Desert (Hot Desert)
    } else if moisture <= 3 {
        return 4; // Savanna
    } else if moisture <= 5 {
        return 6; // Forest (Tropical/Rainforest)
    } else {
        return 12; // Swamp
    }
}

/// Generate tile data for a DGGS cell based on its position on the unit sphere.
fn generate_tile_for_position(seed: &str, planet_type: &str, pos: V3, _cell_idx: usize) -> Tile {
    let mut seed_hash: u32 = 0;
    for c in seed.chars() {
        seed_hash = seed_hash.wrapping_mul(31).wrapping_add(c as u32);
    }
    
    // Scale coords to have nice feature sizes (e.g. frequency 2.2 for continents)
    let e_noise = fbm3d(V3::new(pos.x * 2.2, pos.y * 2.2, pos.z * 2.2), 3, seed_hash);
    let m_noise = fbm3d(V3::new(pos.x * 1.8, pos.y * 1.8, pos.z * 1.8), 3, seed_hash.wrapping_add(1000));
    let local_noise = fbm3d(V3::new(pos.x * 6.0, pos.y * 6.0, pos.z * 6.0), 2, seed_hash.wrapping_add(2000));
    
    let lat = pos.y.asin();
    let abs_lat = lat.abs();
    
    let mut e = e_noise;
    let mut m = m_noise;
    let mut temp_bias = 0.0;
    let mut temp_scale = 1.0;
    let mut is_eyeball = false;
    
    match planet_type {
        "desert" => {
            // Hot and dry
            m = m * 0.25;
            temp_bias = 0.25;
        }
        "ocean" => {
            // Flood heavily, only the highest peaks form small scattered islands
            e = (e_noise - 0.32).max(0.0) * 1.35;
            m = m * 1.3;
        }
        "ice" | "frozen" => {
            // Cold
            temp_scale = 0.25;
        }
        "volcanic" => {
            // Hot, dry/moderate, high volcanic terrain
            temp_bias = 0.3;
            m = m * 0.2;
        }
        "barren" => {
            // Lifeless, dry
            m = 0.0;
        }
        "eyeball" => {
            is_eyeball = true;
        }
        _ => {} // terrestrial
    }
    
    // On Eyeball planets, we want a smaller central ocean (pupil), a dry ring (iris), and a massive ice cap (sclera).
    if is_eyeball {
        if pos.z > 0.75 {
            // Day side "pupil" ocean. Lower the elevation to force an ocean.
            let depth = (pos.z - 0.75) * 4.0; // 0.0 to 1.0 at the center
            e = e * (1.0 - depth) - (depth * 0.3); 
            m = m * 2.0; 
        } else if pos.z > 0.3 {
            // Twilight zone "iris" dry ground.
            e = e * 0.8 + 0.2; // Ensure it's land
            m = m * 0.2; // Bake the moisture out to make it dry/desert
        } else {
            // Night side "sclera" ice cap. Starts even on the edges of the day side!
            e = e * 0.7 + 0.3; // Ensure it's land
            m = m * 1.5; // High moisture for ice
        }
    }
    
    let elevation = (e * 8.0).clamp(0.0, 7.0) as u8;
    let moisture = (m * 8.0).clamp(0.0, 7.0) as u8;
    
    let lat_factor = 1.0 - abs_lat / (std::f64::consts::PI / 2.0);
    let elevation_penalty = (elevation as f64) * 0.08;
    let noise_var = (local_noise - 0.5) * 0.15;
    
    let mut t_val = if is_eyeball {
        // Temperature strictly follows the distance to the sub-stellar point (z = 1.0)
        let sub_stellar_dist = (pos.z + 1.0) / 2.0; 
        (sub_stellar_dist - elevation_penalty + noise_var * 1.5).clamp(0.0, 1.0)
    } else {
        (lat_factor - elevation_penalty + noise_var) * temp_scale + temp_bias
    };
    
    t_val = t_val.clamp(0.0, 1.0);
    let temp = (t_val * 8.0) as u8;
    
    let biome = resolve_whittaker_biome(planet_type, elevation, moisture, temp, local_noise);
    
    // Factions & features
    let faction_noise = fbm3d(V3::new(pos.x * 4.0, pos.y * 4.0, pos.z * 4.0), 2, seed_hash.wrapping_add(3000));
    let feature_noise = fbm3d(V3::new(pos.x * 8.0, pos.y * 8.0, pos.z * 8.0), 2, seed_hash.wrapping_add(4000));
    
    let faction = if faction_noise < 0.15 { ((faction_noise * 20.0) as u8).min(3) + 1 } else { 0 };
    let feature = if feature_noise < 0.08 { ((feature_noise * 110.0) as u8).min(9) + 1 } else { 0 };
    
    Tile { biome, elevation, moisture, faction, feature }
}

/// Encode a DGGS grid into the VRGD binary format.
///
/// Format:
/// ```text
/// Header (12 bytes):
///   Magic: 4 bytes (VRGD = 0x56 0x52 0x47 0x44)
///   CellCount: u32
///   MetaLen: u32
///
/// Per cell (fixed 88 bytes):
///   center: 3 × f32 (12 bytes)
///   tile: u16 (2 bytes)
///   sides: u8 (1 byte)
///   _pad: u8 (1 byte)
///   polygon: 6 × 3 × f32 = 72 bytes (pentagons duplicate last vertex)
///
/// Metadata JSON trailer
/// ```
pub fn encode_dggs_vmb(grid: &DGGSGrid, metadata: &serde_json::Value) -> Vec<u8> {
    let meta_str = serde_json::to_string(metadata).unwrap_or_default();
    let meta_bytes = meta_str.as_bytes();
    let cell_count = grid.cells.len() as u32;
    let cell_block = 88; // fixed bytes per cell

    let total = 12 + (cell_count as usize * cell_block) + meta_bytes.len();
    let mut buf = vec![0u8; total];

    // Header
    buf[0] = 0x56; buf[1] = 0x52; buf[2] = 0x47; buf[3] = 0x44; // VRGD
    let cc = cell_count.to_be_bytes();
    buf[4..8].copy_from_slice(&cc);
    let ml = (meta_bytes.len() as u32).to_be_bytes();
    buf[8..12].copy_from_slice(&ml);

    // Cell data
    for (i, cell) in grid.cells.iter().enumerate() {
        let off = 12 + i * cell_block;

        // Center (f32 × 3)
        let cx = (cell.center.x as f32).to_be_bytes();
        let cy = (cell.center.y as f32).to_be_bytes();
        let cz = (cell.center.z as f32).to_be_bytes();
        buf[off..off+4].copy_from_slice(&cx);
        buf[off+4..off+8].copy_from_slice(&cy);
        buf[off+8..off+12].copy_from_slice(&cz);

        // Tile data (u16)
        let td = pack_tile(&cell.tile).to_be_bytes();
        buf[off+12..off+14].copy_from_slice(&td);

        // Sides count
        let sides = cell.vertices.len().min(6) as u8;
        buf[off+14] = sides;
        buf[off+15] = 0; // padding

        // Polygon vertices (6 slots × 3 × f32 = 72 bytes)
        for vi in 0..6 {
            let src_vi = if vi < cell.vertices.len() { vi } else { 0 }; // wrap for pentagons
            let v = &cell.vertices[src_vi];
            let voff = off + 16 + vi * 12;
            let vx = (v.x as f32).to_be_bytes();
            let vy = (v.y as f32).to_be_bytes();
            let vz = (v.z as f32).to_be_bytes();
            buf[voff..voff+4].copy_from_slice(&vx);
            buf[voff+4..voff+8].copy_from_slice(&vy);
            buf[voff+8..voff+12].copy_from_slice(&vz);
        }
    }

    // Metadata trailer
    let trailer_off = 12 + cell_count as usize * cell_block;
    buf[trailer_off..].copy_from_slice(meta_bytes);

    buf
}
