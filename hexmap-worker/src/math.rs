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
