// Pure snake logic for /snake.

export type Pt = { x: number; y: number }
export type Dir = 'up' | 'down' | 'left' | 'right'
export type Snake = { body: Pt[]; dir: Dir; food: Pt; w: number; h: number; alive: boolean; score: number; seed: number }

const D: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }

function lcg(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0
}

export function newGame(w: number, h: number, seed = 1): Snake {
  const body = [{ x: Math.floor(w / 2), y: Math.floor(h / 2) }]
  return placeFood({ body, dir: 'right', food: { x: 0, y: 0 }, w, h, alive: true, score: 0, seed })
}

function placeFood(s: Snake): Snake {
  let seed = s.seed
  for (let i = 0; i < 200; i++) {
    seed = lcg(seed)
    const x = seed % s.w
    seed = lcg(seed)
    const y = seed % s.h
    if (!s.body.some(p => p.x === x && p.y === y)) return { ...s, food: { x, y }, seed }
  }
  return { ...s, seed }
}

export function turnTo(s: Snake, dir: Dir): Snake {
  return dir === OPPOSITE[s.dir] && s.body.length > 1 ? s : { ...s, dir }
}

export function step(s: Snake): Snake {
  if (!s.alive) return s
  const head = s.body[0]
  const nx = head.x + D[s.dir].x
  const ny = head.y + D[s.dir].y
  const hitsWall = nx < 0 || ny < 0 || nx >= s.w || ny >= s.h
  const eats = nx === s.food.x && ny === s.food.y
  const body = [{ x: nx, y: ny }, ...s.body]
  if (!eats) body.pop()
  const hitsSelf = body.slice(1).some(p => p.x === nx && p.y === ny)
  if (hitsWall || hitsSelf) return { ...s, alive: false }
  const next = { ...s, body, score: s.score + (eats ? 1 : 0) }
  return eats ? placeFood(next) : next
}

export function renderSnake(s: Snake): string[] {
  const rows: string[] = []
  for (let y = 0; y < s.h; y++) {
    let row = ''
    for (let x = 0; x < s.w; x++) {
      if (s.body[0].x === x && s.body[0].y === y) row += 'O'
      else if (s.body.some(p => p.x === x && p.y === y)) row += 'o'
      else if (s.food.x === x && s.food.y === y) row += '*'
      else row += '.'
    }
    rows.push(`|${row}|`)
  }
  const edge = `+${'-'.repeat(s.w)}+`
  return [edge, ...rows, edge]
}
