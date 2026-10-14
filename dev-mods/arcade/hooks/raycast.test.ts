import { expect, test } from 'claude-code/testing'

import { castRay, minimap, move, normAngle, project, render, shade, shoot, turn, wander } from './raycast'
import type { Enemy } from './raycast'
import { newGame, step, turnTo } from './snake'

const BOX = ['#####', '#...#', '#...#', '#...#', '#####']

test('DDA distance to a wall is exact', async () => {
  // Player at (1.5, 2.5) facing +x: wall at x=4, distance 2.5.
  expect(Math.abs(castRay(BOX, 1.5, 2.5, 0).dist - (2.5)) < 1e-6).toBe(true)
  // Facing -y from (2.5, 2.5): the wall row 0 starts at y=1 -> distance 1.5.
  expect(Math.abs(castRay(BOX, 2.5, 2.5, -Math.PI / 2).dist - (1.5)) < 1e-6).toBe(true)
  expect(castRay(BOX, 2.5, 2.5, 0).side).toBe(0)
})

test('shading gets lighter with distance', async () => {
  expect(shade(0.5)).toBe('█')
  expect(shade(15)).toBe('·')
  expect(shade(1, 1)).not.toBe(shade(1, 0))
})

test('frame has exact bounds and shades a wall faced at known distance', async () => {
  const rows = render(BOX, { x: 2.5, y: 2.5, a: 0 }, 41, 15)
  expect(rows).toHaveLength(15)
  expect(rows.every(r => r.length === 41)).toBe(true)
  // Wall at distance 1.5 ahead: centre column's middle row uses that shade.
  expect(rows[7][20]).not.toBe(' ')
  const centre = castRay(BOX, 2.5, 2.5, 0)
  expect(Math.abs(centre.dist - (1.5)) < 1e-6).toBe(true)
})

test('turning changes the view and wraps angles', async () => {
  const p = { x: 2.5, y: 2.5, a: 0 }
  const left = render(BOX, p, 31, 11)
  const turned = render(BOX, turn(p, Math.PI / 2), 31, 11)
  expect(turned).not.toEqual(left)
  expect(Math.abs(Math.abs(turn(p, 3 * Math.PI).a) - Math.PI) < 1e-6).toBe(true) // 3pi wraps to +/-pi
  expect(Math.abs(turn(turn(p, 0.5), -0.5).a - (0)) < 1e-6).toBe(true)
})

test('movement stops at walls', async () => {
  let p = { x: 3.5, y: 2.5, a: 0 }
  for (let i = 0; i < 20; i++) p = move(BOX, p, 0.25)
  expect(p.x).toBeLessThan(4)
})

test('shooting hits a centred enemy, misses an off-centre one, not through walls', async () => {
  const p = { x: 1.5, y: 2.5, a: 0 }
  const centred: Enemy = { x: 3.0, y: 2.5, alive: true, dir: 0 }
  const side: Enemy = { x: 3.0, y: 1.5, alive: true, dir: 0 }
  expect(shoot(BOX, p, [side, centred])).toBe(1)
  expect(shoot(BOX, p, [side])).toBe(-1)
  expect(shoot(BOX, p, [{ ...centred, alive: false }])).toBe(-1)
  const walled = ['#######', '#..#..#', '#######']
  expect(shoot(walled, { x: 1.5, y: 1.5, a: 0 }, [{ x: 4.5, y: 1.5, alive: true, dir: 0 }])).toBe(-1)
})

test('enemy renders as @ and minimap shows player', async () => {
  const p = { x: 1.5, y: 2.5, a: 0 }
  const e: Enemy = { x: 3.0, y: 2.5, alive: true, dir: 0 }
  expect(project(p, e, 41)?.col).toBe(20)
  expect(render(BOX, p, 41, 15, [e]).join('\n')).toContain('@')
  expect(minimap(BOX, p, [])[2][1]).toBe('>')
})

test('wander keeps enemies out of walls', async () => {
  let seed = 7
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  let es: Enemy[] = [{ x: 2.5, y: 2.5, alive: true, dir: 0 }]
  for (let i = 0; i < 500; i++) es = wander(BOX, es, rng)
  expect(es[0].x).toBeGreaterThan(1)
  expect(es[0].x).toBeLessThan(4)
  expect(es[0].y).toBeGreaterThan(1)
  expect(es[0].y).toBeLessThan(4)
})

test('snake moves, eats, and dies on a wall', async () => {
  let s = newGame(6, 3)
  s = { ...s, food: { x: s.body[0].x + 1, y: s.body[0].y } }
  s = step(s)
  expect(s.score).toBe(1)
  expect(s.body).toHaveLength(2)
  expect(turnTo(s, 'left').dir).toBe('right') // no reversing
  for (let i = 0; i < 10; i++) s = step(s)
  expect(s.alive).toBe(false)
})
