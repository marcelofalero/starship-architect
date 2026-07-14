use serde::{Deserialize, Serialize};
use crate::math::V3;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct Tile {
    pub biome: u8,
    pub elevation: u8,
    pub moisture: u8,
    pub faction: u8,
    pub feature: u8,
    pub settlement: u8,
    pub specialization: u8,
    pub subsurface: bool,
}

pub struct DGGSCell {
    pub center: V3,
    pub vertices: Vec<V3>,
    pub tile: Tile,
}

pub struct DGGSGrid {
    pub resolution: u8,
    pub cells: Vec<DGGSCell>,
}
