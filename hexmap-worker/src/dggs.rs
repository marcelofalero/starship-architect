use crate::{Tile, Rng, pack_tile};
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
}

/// Generate a DGGS grid at the given resolution using icosahedral subdivision.
pub fn generate_dggs(seed: &str, planet_type: &str, resolution: u8) -> DGGSGrid {
    // Step 1: Build icosphere
    let (verts, faces) = build_icosphere(resolution as usize);

    // Step 2: Compute dual (Goldberg polyhedron) - each vertex becomes a cell
    let cells_raw = compute_dual(&verts, &faces);

    // Step 3: Assign tile data to each cell based on its spherical position
    let cells = cells_raw.into_iter().enumerate().map(|(i, (center, boundary))| {
        let tile = generate_tile_for_position(seed, planet_type, center, i);
        DGGSCell { center, vertices: boundary, tile }
    }).collect();

    DGGSGrid { resolution, cells }
}

/// Build a subdivided icosphere. Returns (vertices, triangle_faces).
fn build_icosphere(resolution: usize) -> (Vec<V3>, Vec<[usize; 3]>) {
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

    // Subdivide
    for _ in 0..resolution {
        let mut new_faces = Vec::with_capacity(faces.len() * 4);
        let mut midpoint_cache: HashMap<(usize, usize), usize> = HashMap::new();

        for face in &faces {
            let a = face[0]; let b = face[1]; let c = face[2];
            let ab = get_midpoint(&mut verts, &mut midpoint_cache, a, b);
            let bc = get_midpoint(&mut verts, &mut midpoint_cache, b, c);
            let ca = get_midpoint(&mut verts, &mut midpoint_cache, c, a);
            new_faces.push([a, ab, ca]);
            new_faces.push([b, bc, ab]);
            new_faces.push([c, ca, bc]);
            new_faces.push([ab, bc, ca]);
        }
        faces = new_faces;
    }

    (verts, faces)
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

/// Generate tile data for a DGGS cell based on its position on the unit sphere.
fn generate_tile_for_position(seed: &str, planet_type: &str, pos: V3, cell_idx: usize) -> Tile {
    // Use spherical coordinates for deterministic seeding
    let lat = pos.y.asin();
    let lon = pos.z.atan2(pos.x);
    let lat_i = ((lat + std::f64::consts::FRAC_PI_2) * 1000.0) as i32;
    let lon_i = ((lon + std::f64::consts::PI) * 1000.0) as i32;

    let mut rng = Rng::new(&format!("{}-{}-{}-{}", seed, planet_type, lat_i, lon_i));
    let n1 = rng.next();
    let n2 = rng.next();
    let n3 = rng.next();

    let mut biome: u8;
    let mut elevation: u8;
    let mut moisture: u8;
    let faction: u8;
    let feature: u8;

    match planet_type {
        "desert" => {
            elevation = ((n1 * 4.0) as u8) + 2;
            moisture = (n2 * 2.0) as u8;
            if n3 < 0.05 { biome = 13; }
            else if n3 < 0.2 { biome = 11; elevation = 6; }
            else { biome = 2; }
        }
        "ocean" => {
            elevation = (n1 * 3.0) as u8;
            moisture = ((n2 * 2.0) as u8) + 6;
            if elevation == 2 && n3 < 0.1 { biome = 3; elevation = 3; }
            else if elevation == 2 { biome = 1; }
            else { biome = 0; }
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
            // Use latitude for climate zones
            let abs_lat = lat.abs();
            if abs_lat > 1.2 { // polar
                biome = if n3 < 0.4 { 7 } else { 8 };
            } else if elevation <= 2 {
                biome = 0; // ocean
            } else if elevation == 3 {
                biome = if abs_lat < 0.3 { 3 } else { 1 }; // beach/shallow
            } else if elevation <= 5 {
                biome = 4; // grassland
            } else {
                biome = 11; // mountain
            }
        }
    }

    // Factions & features (same logic as flat grid)
    let f1 = rng.next();
    let f2 = rng.next();
    let f3 = rng.next();
    let f4 = rng.next();

    let faction_val = if f1 < 0.15 { ((f2 * 3.0) as u8) + 1 } else { 0 };
    let feature_val = if f3 < 0.08 { ((f4 * 9.0) as u8) + 1 } else { 0 };

    Tile { biome, elevation, moisture, faction: faction_val, feature: feature_val }
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
