// Pure raycasting engine for /doom. No engine APIs here.

export const MAP: string[] = [
  '################',
  '#..............#',
  '#..##....###...#',
  '#..#.......#...#',
  '#..#.......#...#',
  '#.......##.....#',
  '#...##.........#',
  '#...#....###...#',
  '#........#.....#',
  '#..###...#..##.#',
  '#..............#',
  '################',
]

export type Player = { x: number; y: number; a: number }
export type Enemy = { x: number; y: number; alive: boolean; dir: number }
export type Hit = { dist: number; side: 0 | 1 }

export const FOV = Math.PI / 3
export const MAX_DEPTH = 16
// Darkest to nearest-first: index grows with distance.
export const SHADES = ['█', '▓', '▒', '░', '·']

export function isWall(map: string[], x: number, y: number): boolean {
  const row = map[Math.floor(y)]
  if (row === undefined) return true
  const c = row[Math.floor(x)]
  return c === undefined || c === '#'
}

/** DDA grid walk: distance along the ray to the first wall and which face was hit. */
export function castRay(map: string[], px: number, py: number, angle: number): Hit {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  let mx = Math.floor(px)
  let my = Math.floor(py)
  const ddx = dx === 0 ? Infinity : Math.abs(1 / dx)
  const ddy = dy === 0 ? Infinity : Math.abs(1 / dy)
  const sx = dx < 0 ? -1 : 1
  const sy = dy < 0 ? -1 : 1
  let tx = dx === 0 ? Infinity : (dx < 0 ? px - mx : mx + 1 - px) * ddx
  let ty = dy === 0 ? Infinity : (dy < 0 ? py - my : my + 1 - py) * ddy
  let side: 0 | 1 = 0
  let dist = 0
  for (let i = 0; i < 256; i++) {
    if (tx < ty) {
      dist = tx
      tx += ddx
      mx += sx
      side = 0
    } else {
      dist = ty
      ty += ddy
      my += sy
      side = 1
    }
    if (isWall(map, mx, my)) return { dist, side }
    if (dist > MAX_DEPTH) break
  }
  return { dist: MAX_DEPTH, side }
}

/** Shade glyph for a wall at dist; side-1 faces read one step darker. */
export function shade(dist: number, side: 0 | 1 = 0): string {
  const step = Math.min(SHADES.length - 1, Math.floor((dist / MAX_DEPTH) * (SHADES.length + 1)) + side)
  return SHADES[Math.max(0, Math.min(SHADES.length - 1, step))]
}

export function normAngle(a: number): number {
  let r = a % (2 * Math.PI)
  if (r > Math.PI) r -= 2 * Math.PI
  if (r < -Math.PI) r += 2 * Math.PI
  return r
}

export function turn(p: Player, delta: number): Player {
  return { ...p, a: normAngle(p.a + delta) }
}

/** Move forward/back and strafe, sliding is not attempted: blocked axes stay put. */
export function move(map: string[], p: Player, forward: number, strafe = 0): Player {
  const dx = Math.cos(p.a) * forward + Math.cos(p.a + Math.PI / 2) * strafe
  const dy = Math.sin(p.a) * forward + Math.sin(p.a + Math.PI / 2) * strafe
  const pad = 0.15
  const nx = p.x + dx
  const ny = p.y + dy
  const okX = !isWall(map, nx + Math.sign(dx) * pad, p.y)
  const okY = !isWall(map, p.x, ny + Math.sign(dy) * pad)
  return { ...p, x: okX ? nx : p.x, y: okY ? ny : p.y }
}

/** Where an enemy appears on screen: column and apparent size, or null if out of view. */
export function project(p: Player, e: Enemy, w: number): { col: number; dist: number } | null {
  const dx = e.x - p.x
  const dy = e.y - p.y
  const dist = Math.hypot(dx, dy)
  const rel = normAngle(Math.atan2(dy, dx) - p.a)
  if (Math.abs(rel) > FOV / 2 || dist < 0.2) return null
  return { col: Math.round((0.5 + rel / FOV) * (w - 1)), dist }
}

/** Index of the enemy hit by a shot straight down the view centre, or -1. */
export function shoot(map: string[], p: Player, enemies: Enemy[]): number {
  const wall = castRay(map, p.x, p.y, p.a).dist
  let best = -1
  let bestDist = Infinity
  enemies.forEach((e, i) => {
    if (!e.alive) return
    const dx = e.x - p.x
    const dy = e.y - p.y
    const dist = Math.hypot(dx, dy)
    const rel = Math.abs(normAngle(Math.atan2(dy, dx) - p.a))
    const tolerance = Math.atan2(0.3, dist) // enemy is roughly 0.6 wide
    if (rel <= tolerance && dist < wall && dist < bestDist) {
      best = i
      bestDist = dist
    }
  })
  return best
}

/** One wander step. rng() must return [0,1); injected so this stays pure. */
export function wander(map: string[], enemies: Enemy[], rng: () => number, speed = 0.08): Enemy[] {
  return enemies.map(e => {
    if (!e.alive) return e
    let dir = e.dir
    if (rng() < 0.1) dir += (rng() - 0.5) * 2
    const nx = e.x + Math.cos(dir) * speed
    const ny = e.y + Math.sin(dir) * speed
    if (isWall(map, nx, ny)) return { ...e, dir: dir + Math.PI / 2 + rng() }
    return { ...e, x: nx, y: ny, dir }
  })
}

export function minimap(map: string[], p: Player, enemies: Enemy[]): string[] {
  const arrows = ['>', 'v', '<', '^']
  const quarter = Math.round(normAngle(p.a) / (Math.PI / 2))
  const arrow = arrows[((quarter % 4) + 4) % 4]
  return map.map((row, y) =>
    [...row]
      .map((c, x) => {
        if (Math.floor(p.x) === x && Math.floor(p.y) === y) return arrow
        if (enemies.some(e => e.alive && Math.floor(e.x) === x && Math.floor(e.y) === y)) return '@'
        return c === '#' ? '#' : ' '
      })
      .join(''),
  )
}

/** Render one frame: (map, player) -> rows of exactly w characters. */
export function render(map: string[], p: Player, w: number, h: number, enemies: Enemy[] = []): string[] {
  const grid: string[][] = Array.from({ length: h }, () => Array<string>(w).fill(' '))
  const depth: number[] = Array(w).fill(MAX_DEPTH)
  for (let col = 0; col < w; col++) {
    const ray = p.a - FOV / 2 + (col / Math.max(1, w - 1)) * FOV
    const hit = castRay(map, p.x, p.y, ray)
    const dist = Math.max(0.1, hit.dist * Math.cos(ray - p.a)) // fisheye fix
    depth[col] = hit.dist
    const wallH = Math.min(h, Math.floor(h / dist))
    const top = Math.floor((h - wallH) / 2)
    for (let row = 0; row < h; row++) {
      if (row >= top && row < top + wallH) grid[row][col] = shade(hit.dist, hit.side)
      else if (row >= h / 2) grid[row][col] = row > h * 0.75 ? ':' : '.'
    }
  }
  for (const e of [...enemies].filter(x => x.alive).sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y))) {
    const pr = project(p, e, w)
    if (!pr) continue
    const size = Math.max(1, Math.min(h, Math.floor((h / pr.dist) * 0.6)))
    const half = Math.max(0, Math.floor(size / 2))
    const top = Math.floor((h - size) / 2)
    for (let col = pr.col - half; col <= pr.col + half; col++) {
      if (col < 0 || col >= w || depth[col] < pr.dist) continue
      for (let row = top; row < top + size; row++) if (row >= 0 && row < h) grid[row][col] = '@'
    }
  }
  const mm = minimap(map, p, enemies)
  if (w >= mm[0].length + 4 && h >= mm.length + 2) {
    mm.forEach((r, i) => {
      for (let j = 0; j < r.length; j++) grid[i + 1][w - mm[0].length - 1 + j] = r[j]
    })
  }
  if (h >= 3 && w >= 3) grid[Math.floor(h / 2)][Math.floor(w / 2)] = '+'
  return grid.map(r => r.join(''))
}

export function spawnEnemies(): Enemy[] {
  return [
    { x: 5.5, y: 4.5, alive: true, dir: 0.5 },
    { x: 10.5, y: 6.5, alive: true, dir: 2.0 },
    { x: 13.5, y: 9.5, alive: true, dir: 4.0 },
    { x: 7.5, y: 10.5, alive: true, dir: 1.0 },
  ]
}

export const START: Player = { x: 2.5, y: 1.5, a: 0.6 }

/** Tiny deterministic LCG so the game state stays serialisable. */
export function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0
}
