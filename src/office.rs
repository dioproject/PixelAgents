// ============================================================
// office.rs — Peta kantor (rooms, furniture, seats, hotspot)
// + grid walkable + A* 4 arah. Port dari src/world/office.js.
// ============================================================

pub const MAP_W: i32 = 96;
pub const MAP_H: i32 = 63;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Div {
    It,
    Marketing,
    Finance,
    Hrd,
    Ga,
    Exec,
}

impl Div {
    pub fn id(&self) -> &'static str {
        match self {
            Div::It => "it",
            Div::Marketing => "marketing",
            Div::Finance => "finance",
            Div::Hrd => "hrd",
            Div::Ga => "ga",
            Div::Exec => "exec",
        }
    }
    pub fn short(&self) -> &'static str {
        match self {
            Div::It => "IT",
            Div::Marketing => "Marketing",
            Div::Finance => "Finance",
            Div::Hrd => "HRD",
            Div::Ga => "GA",
            Div::Exec => "Direksi",
        }
    }
    pub fn name(&self) -> &'static str {
        match self {
            Div::It => "IT & Engineering",
            Div::Marketing => "Marketing & Creative",
            Div::Finance => "Finance & Accounting",
            Div::Hrd => "HRD & People Ops",
            Div::Ga => "General Affairs",
            Div::Exec => "Direksi",
        }
    }
    pub fn color(&self) -> [u8; 3] {
        match self {
            Div::It => [0x8f, 0xb3, 0xff],
            Div::Marketing => [0xff, 0x9e, 0xc4],
            Div::Finance => [0x9f, 0xe6, 0xa0],
            Div::Hrd => [0x7c, 0xe0, 0xd6],
            Div::Ga => [0xff, 0xd9, 0x8a],
            Div::Exec => [0xff, 0xc8, 0x57],
        }
    }
}

#[derive(Clone, Copy)]
pub struct Room {
    pub id: &'static str,
    pub label: Option<&'static str>,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub floor: &'static str,
    pub corridor: bool,
}

#[derive(Clone, Copy)]
pub struct Furn {
    pub kind: &'static str,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub blocking: bool,
}

const fn f(kind: &'static str, x: i32, y: i32, w: i32, h: i32) -> Furn {
    Furn {
        kind,
        x,
        y,
        w,
        h,
        blocking: true,
    }
}
const fn fd(kind: &'static str, x: i32, y: i32, w: i32, h: i32) -> Furn {
    // dekorasi: tidak menghalangi
    Furn {
        kind,
        x,
        y,
        w,
        h,
        blocking: false,
    }
}

pub const DOORS: [(i32, i32); 26] = [
    (15, 21),
    (16, 21),
    (47, 21),
    (48, 21),
    (79, 21),
    (80, 21),
    (13, 27),
    (14, 27),
    (41, 27),
    (42, 27),
    (76, 27),
    (77, 27),
    (13, 47),
    (14, 47),
    (41, 47),
    (42, 47),
    (76, 47),
    (77, 47),
    (15, 52),
    (16, 52),
    (40, 52),
    (41, 52),
    (73, 52),
    (74, 52),
    // pintu lobby keluar (untuk jalan pulang)
    (73, 62),
    (74, 62),
];

pub const ROOMS: [Room; 11] = [
    Room {
        id: "it",
        label: Some("IT & Engineering"),
        x: 1,
        y: 1,
        w: 30,
        h: 20,
        floor: "it",
        corridor: false,
    },
    Room {
        id: "meeting",
        label: Some("Ruang Meeting «Sinergi»"),
        x: 33,
        y: 1,
        w: 29,
        h: 20,
        floor: "meeting",
        corridor: false,
    },
    Room {
        id: "director",
        label: Some("Ruang Direktur"),
        x: 64,
        y: 1,
        w: 31,
        h: 20,
        floor: "director",
        corridor: false,
    },
    Room {
        id: "corridor1",
        label: None,
        x: 1,
        y: 22,
        w: 94,
        h: 5,
        floor: "corridor",
        corridor: true,
    },
    Room {
        id: "finance",
        label: Some("Finance & Accounting"),
        x: 1,
        y: 28,
        w: 25,
        h: 19,
        floor: "finance",
        corridor: false,
    },
    Room {
        id: "marketing",
        label: Some("Marketing & Creative"),
        x: 28,
        y: 28,
        w: 28,
        h: 19,
        floor: "marketing",
        corridor: false,
    },
    Room {
        id: "pantry",
        label: Some("Pantry & Lounge"),
        x: 58,
        y: 28,
        w: 37,
        h: 19,
        floor: "pantry",
        corridor: false,
    },
    Room {
        id: "corridor2",
        label: None,
        x: 1,
        y: 48,
        w: 94,
        h: 4,
        floor: "corridor",
        corridor: true,
    },
    Room {
        id: "hrd",
        label: Some("HRD & People Ops"),
        x: 1,
        y: 53,
        w: 29,
        h: 9,
        floor: "hrd",
        corridor: false,
    },
    Room {
        id: "ga",
        label: Some("General Affairs"),
        x: 32,
        y: 53,
        w: 18,
        h: 9,
        floor: "ga",
        corridor: false,
    },
    Room {
        id: "lobby",
        label: Some("Lobby & Reception"),
        x: 52,
        y: 53,
        w: 43,
        h: 9,
        floor: "lobby",
        corridor: false,
    },
];

pub const FURNITURE: &[Furn] = &[
    // IT
    f("desk", 4, 3, 2, 1),
    f("desk", 8, 3, 2, 1),
    f("desk", 12, 3, 2, 1),
    f("deskL", 17, 3, 3, 1),
    f("serverRack", 1, 3, 1, 2),
    f("beanbag", 27, 16, 1, 1),
    f("beanbag", 28, 17, 1, 1),
    fd("whiteboard", 16, 0, 3, 1),
    fd("acUnit", 24, 0, 2, 1),
    f("plant", 1, 19, 1, 1),
    f("plantBig", 29, 18, 2, 2),
    fd("cables", 6, 8, 2, 1),
    fd("stain", 22, 10, 1, 1),
    // Meeting
    f("conference", 44, 8, 5, 3),
    fd("screen", 45, 0, 3, 1),
    fd("whiteboard", 57, 0, 3, 1),
    f("dispenser", 59, 1, 1, 1),
    f("plantBig", 33, 18, 2, 2),
    f("plant", 61, 1, 1, 1),
    fd("acUnit", 36, 0, 2, 1),
    // Direktur
    f("directorDesk", 71, 4, 4, 1),
    fd("cctvWall", 69, 0, 3, 1),
    fd("acUnit", 88, 0, 2, 1),
    f("sofa", 86, 6, 2, 1),
    f("coffeeTable", 87, 9, 1, 1),
    f("armchair", 89, 7, 1, 1),
    f("cabinet", 64, 5, 1, 1),
    f("cabinet", 64, 6, 1, 1),
    f("plantBig", 64, 1, 2, 2),
    f("plant", 93, 19, 1, 1),
    fd("rug", 77, 11, 6, 4),
    // Finance
    f("desk", 4, 31, 2, 1),
    f("desk", 9, 31, 2, 1),
    f("copier", 1, 33, 2, 1),
    f("cabinet", 1, 29, 1, 1),
    f("cabinet", 1, 30, 1, 1),
    fd("board", 4, 27, 3, 1),
    f("plantBig", 24, 44, 2, 2),
    fd("stain", 8, 40, 1, 1),
    // Marketing
    f("deskL", 31, 31, 3, 1),
    f("deskL", 36, 31, 3, 1),
    f("tripod", 44, 34, 1, 1),
    fd("board", 31, 27, 3, 1),
    fd("rug", 47, 38, 5, 3),
    f("beanbag", 53, 44, 1, 1),
    f("plant", 28, 29, 1, 1),
    f("plant", 54, 45, 1, 1),
    // Pantry
    f("counter", 80, 29, 4, 1),
    f("coffeeMachine", 83, 29, 1, 1),
    f("fridge", 78, 29, 1, 2),
    f("dispenser", 84, 29, 1, 1),
    f("vending", 92, 29, 1, 2),
    f("longTable", 70, 36, 4, 2),
    f("poolTable", 85, 40, 4, 2),
    f("sofa", 60, 42, 2, 1),
    f("armchair", 63, 43, 1, 1),
    f("coffeeTable", 62, 45, 1, 1),
    f("plantBig", 58, 28, 2, 2),
    f("plant", 93, 45, 1, 1),
    fd("acUnit", 68, 27, 2, 1),
    fd("stain", 72, 32, 1, 1),
    fd("stain", 66, 40, 1, 1),
    // HRD
    f("desk", 4, 55, 2, 1),
    f("desk", 8, 55, 2, 1),
    f("sofa", 20, 58, 2, 1),
    f("cabinet", 1, 54, 1, 1),
    f("plant", 28, 60, 1, 1),
    fd("acUnit", 22, 52, 2, 1),
    // GA
    f("workbench", 36, 55, 3, 1),
    f("boxes", 33, 59, 1, 1),
    f("boxes", 35, 59, 1, 1),
    f("boxes", 48, 54, 1, 1),
    fd("toolbox", 44, 58, 1, 1),
    fd("hazard", 34, 60, 6, 1),
    f("plant", 47, 60, 1, 1),
    // Lobby
    f("reception", 80, 56, 4, 1),
    fd("sign", 69, 62, 3, 1),
    f("sofa", 60, 54, 2, 1),
    f("armchair", 63, 55, 1, 1),
    f("plantBig", 52, 53, 2, 2),
    f("plant", 94, 53, 1, 1),
    f("plant", 94, 61, 1, 1),
    fd("stain", 75, 58, 1, 1),
    fd("acUnit", 85, 52, 2, 1),
    // Koridor
    f("plant", 1, 22, 1, 1),
    f("plant", 94, 26, 1, 1),
    fd("stain", 48, 24, 1, 1),
    f("plant", 1, 49, 1, 1),
    f("plant", 94, 50, 1, 1),
];

/// (id, kind, x, y, facing) — facing: 'u','d','l','r'
pub const SEATS: &[(&str, &str, i32, i32, char)] = &[
    ("seat.bayu", "desk", 5, 4, 'u'),
    ("seat.rian", "desk", 9, 4, 'u'),
    ("seat.salsa", "desk", 13, 4, 'u'),
    ("seat.jessica", "desk", 32, 32, 'u'),
    ("seat.fajar", "desk", 37, 32, 'u'),
    ("seat.endang", "desk", 5, 32, 'u'),
    ("seat.dimas", "desk", 10, 32, 'u'),
    ("seat.maya", "desk", 5, 56, 'u'),
    ("seat.kevin", "desk", 9, 56, 'u'),
    ("seat.joko", "desk", 37, 56, 'u'),
    ("seat.director", "desk", 72, 5, 'u'),
    // Meeting
    ("seat.meet.0", "meeting", 44, 7, 'd'),
    ("seat.meet.1", "meeting", 45, 7, 'd'),
    ("seat.meet.2", "meeting", 46, 7, 'd'),
    ("seat.meet.3", "meeting", 47, 7, 'd'),
    ("seat.meet.4", "meeting", 48, 7, 'd'),
    ("seat.meet.5", "meeting", 44, 11, 'u'),
    ("seat.meet.6", "meeting", 45, 11, 'u'),
    ("seat.meet.7", "meeting", 46, 11, 'u'),
    ("seat.meet.8", "meeting", 47, 11, 'u'),
    ("seat.meet.9", "meeting", 48, 11, 'u'),
    ("seat.meet.10", "meeting", 43, 9, 'r'),
    ("seat.meet.11", "meeting", 49, 9, 'l'),
    // Lunch / lounge
    ("seat.lunch.0", "pantry", 70, 35, 'd'),
    ("seat.lunch.1", "pantry", 71, 35, 'd'),
    ("seat.lunch.2", "pantry", 72, 35, 'd'),
    ("seat.lunch.3", "pantry", 73, 35, 'd'),
    ("seat.lunch.4", "pantry", 70, 38, 'u'),
    ("seat.lunch.5", "pantry", 71, 38, 'u'),
    ("seat.lunch.6", "pantry", 72, 38, 'u'),
    ("seat.lunch.7", "pantry", 73, 38, 'u'),
    ("seat.sofa.0", "sofa", 60, 43, 'u'),
    ("seat.sofa.1", "sofa", 61, 43, 'u'),
    ("seat.lobby.0", "lobby", 60, 55, 'u'),
    ("seat.lobby.1", "lobby", 61, 55, 'u'),
    ("seat.hr.0", "sofa", 20, 59, 'u'),
    ("seat.hr.1", "sofa", 21, 59, 'u'),
];

pub const HOTSPOTS: &[(&str, &[(i32, i32)])] = &[
    ("coffee", &[(83, 30), (82, 30)]),
    ("dispenser", &[(84, 30)]),
    ("fridge", &[(77, 29), (77, 30)]),
    ("vending", &[(92, 31), (91, 30)]),
    ("copier", &[(1, 34), (2, 34)]),
    ("workbench", &[(36, 56), (37, 56), (38, 56)]),
    ("reception", &[(81, 57), (82, 57)]),
    ("pool", &[(84, 40), (89, 40), (85, 42), (87, 42)]),
];

pub fn room_at(x: i32, y: i32) -> Option<&'static Room> {
    ROOMS
        .iter()
        .find(|r| x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)
}

pub fn seat_pos(id: &str) -> Option<(i32, i32, char)> {
    SEATS.iter().find(|s| s.0 == id).map(|s| (s.2, s.3, s.4))
}

// ---------- World + A* ----------
pub struct World {
    grid: Vec<u8>,
}

impl Default for World {
    fn default() -> Self {
        Self::new()
    }
}

impl World {
    pub fn new() -> Self {
        let mut grid = vec![0u8; (MAP_W * MAP_H) as usize];
        let idx = |x: i32, y: i32| (y * MAP_W + x) as usize;
        // 1) interior ruangan
        for r in ROOMS.iter() {
            for ty in r.y..r.y + r.h {
                for tx in r.x..r.x + r.w {
                    if tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H {
                        grid[idx(tx, ty)] = 1;
                    }
                }
            }
        }
        // 2) pintu
        for (dx, dy) in DOORS.iter() {
            if *dx >= 0 && *dy >= 0 && *dx < MAP_W && *dy < MAP_H {
                grid[idx(*dx, *dy)] = 1;
            }
        }
        // 3) furniture blocking
        for fu in FURNITURE.iter().filter(|f| f.blocking) {
            for ty in fu.y..fu.y + fu.h {
                for tx in fu.x..fu.x + fu.w {
                    if tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H {
                        grid[idx(tx, ty)] = 0;
                    }
                }
            }
        }
        // 4) seat selalu walkable
        for s in SEATS.iter() {
            if s.2 >= 0 && s.3 >= 0 && s.2 < MAP_W && s.3 < MAP_H {
                grid[idx(s.2, s.3)] = 1;
            }
        }
        Self { grid }
    }

    pub fn walkable(&self, x: i32, y: i32) -> bool {
        x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && self.grid[(y * MAP_W + x) as usize] == 1
    }

    /// Cari tile walkable terdekat dari (x,y) dengan BFS terbatas.
    pub fn nearest_walkable(&self, x: i32, y: i32) -> (i32, i32) {
        if self.walkable(x, y) {
            return (x, y);
        }
        for radius in 1..12 {
            for dy in -radius..=radius {
                for dx in -radius..=radius {
                    let (nx, ny) = (x + dx, y + dy);
                    if self.walkable(nx, ny) {
                        return (nx, ny);
                    }
                }
            }
        }
        (x, y)
    }

    /// A* 4 arah. Mengembalikan jalur tile (termasuk start & goal) atau None.
    pub fn astar(&self, start: (i32, i32), goal: (i32, i32)) -> Option<Vec<(i32, i32)>> {
        use std::collections::BinaryHeap;
        let goal = self.nearest_walkable(goal.0, goal.1);
        let start = self.nearest_walkable(start.0, start.1);
        if start == goal {
            return Some(vec![start]);
        }
        let n = (MAP_W * MAP_H) as usize;
        let idx = |x: i32, y: i32| (y * MAP_W + x) as usize;
        let mut g = vec![u32::MAX; n];
        let mut from = vec![usize::MAX; n];
        let h = |x: i32, y: i32| ((x - goal.0).abs() + (y - goal.1).abs()) as u32;
        let mut heap: BinaryHeap<std::cmp::Reverse<(u32, i32, i32)>> = BinaryHeap::new();
        g[idx(start.0, start.1)] = 0;
        heap.push(std::cmp::Reverse((h(start.0, start.1), start.0, start.1)));
        let mut found = false;
        while let Some(std::cmp::Reverse((_, x, y))) = heap.pop() {
            if (x, y) == goal {
                found = true;
                break;
            }
            let gi = g[idx(x, y)];
            for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                let (nx, ny) = (x + dx, y + dy);
                if !self.walkable(nx, ny) {
                    continue;
                }
                let ng = gi + 1;
                let ni = idx(nx, ny);
                if ng < g[ni] {
                    g[ni] = ng;
                    from[ni] = idx(x, y);
                    heap.push(std::cmp::Reverse((ng + h(nx, ny), nx, ny)));
                }
            }
        }
        if !found {
            return None;
        }
        let mut path = Vec::new();
        let mut cur = idx(goal.0, goal.1);
        loop {
            let y = (cur as i32) / MAP_W;
            let x = (cur as i32) % MAP_W;
            path.push((x, y));
            if cur == idx(start.0, start.1) {
                break;
            }
            let prev = from[cur];
            if prev == usize::MAX {
                break;
            }
            cur = prev;
        }
        path.reverse();
        Some(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grid_doors_open() {
        let w = World::new();
        assert!(w.walkable(15, 21), "pintu IT harus terbuka");
        assert!(w.walkable(5, 4), "kursi Bayu harus walkable");
    }

    #[test]
    fn path_between_rooms() {
        let w = World::new();
        // dari kursi Bayu (IT) ke mesin kopi (pantry)
        let p = w.astar((5, 4), (83, 30));
        assert!(p.is_some(), "harus ada jalur IT -> pantry");
        let p = p.unwrap();
        assert!(p.len() > 20);
    }

    #[test]
    fn path_any_room_pairs() {
        let w = World::new();
        let spots = [
            (5, 4),
            (32, 32),
            (5, 32),
            (5, 56),
            (37, 56),
            (72, 5),
            (83, 30),
            (70, 35),
        ];
        for a in spots {
            for b in spots {
                assert!(w.astar(a, b).is_some(), "tak ada jalur {a:?} -> {b:?}");
            }
        }
    }
}
