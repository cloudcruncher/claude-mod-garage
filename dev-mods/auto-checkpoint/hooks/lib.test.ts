import { test, expect } from 'claude-code/testing'
import {
  filePathsFor, riskyBash, absolutePath, buildManifest, pruneList, checkpointId,
  resolveSelection, formatListing, parseManifest,
} from './lib.ts'

test('filePathsFor picks the right key per tool', () => {
  expect(filePathsFor('Edit', { file_path: '/a/b.ts' })).toEqual(['/a/b.ts'])
  expect(filePathsFor('NotebookEdit', { notebook_path: '/n.ipynb' })).toEqual(['/n.ipynb'])
  expect(filePathsFor('Read', { file_path: '/a' })).toEqual([])
  expect(filePathsFor('Write', {})).toEqual([])
})

test('riskyBash flags destructive commands only', () => {
  expect(riskyBash('rm -rf build dist')).toEqual({ paths: ['build', 'dist'], wholeTree: false })
  expect(riskyBash('mv a.txt b.txt')?.paths).toEqual(['a.txt', 'b.txt'])
  expect(riskyBash('git reset --hard HEAD~1')).toEqual({ paths: [], wholeTree: true })
  expect(riskyBash('git checkout -- src/x.ts')).toEqual({ paths: ['src/x.ts'], wholeTree: false })
  expect(riskyBash('git checkout -- .')?.wholeTree).toBe(true)
  expect(riskyBash('npm test && rm "my file.txt"')?.paths).toEqual(['my file.txt'])
  expect(riskyBash('ls -la')).toBeUndefined()
  expect(riskyBash('git status')).toBeUndefined()
  expect(riskyBash('git checkout main')).toBeUndefined()
})

test('absolutePath resolves relative, home and dotdot', () => {
  expect(absolutePath('a/../b.txt', '/proj', '/h')).toBe('/proj/b.txt')
  expect(absolutePath('~/x', '/proj', '/h')).toBe('/h/x')
  expect(absolutePath('/etc//y/.', '/proj', '/h')).toBe('/etc/y')
})

test('buildManifest records existence and stored names', () => {
  const m = buildManifest('Edit', 5, [{ path: '/a', existed: true }, { path: '/b', existed: false }])
  expect(m.entries[0]).toEqual({ path: '/a', existed: true, stored: '0' })
  expect(m.entries[1]).toEqual({ path: '/b', existed: false })
  expect(parseManifest(JSON.stringify(m))?.entries.length).toBe(2)
  expect(parseManifest('nope')).toBeUndefined()
})

test('pruneList keeps the newest N across sessions', () => {
  const refs = Array.from({ length: 205 }, (_, i) => ({ session: i % 2 ? 's1' : 's2', id: checkpointId(1000 + i) }))
  const drop = pruneList(refs, 200)
  expect(drop.length).toBe(5)
  expect(drop.map(d => d.id).sort()).toEqual(refs.slice(0, 5).map(r => r.id).sort())
  expect(pruneList(refs.slice(0, 10), 200)).toEqual([])
})

test('resolveSelection handles list, last, numbers, junk', () => {
  expect(resolveSelection('', 3)).toBe('list')
  expect(resolveSelection('last', 3)).toBe(0)
  expect(resolveSelection('last', 0)).toBe('invalid')
  expect(resolveSelection('2', 3)).toBe(1)
  expect(resolveSelection('4', 3)).toBe('invalid')
  expect(resolveSelection('0', 3)).toBe('invalid')
  expect(resolveSelection('x', 3)).toBe('invalid')
})

test('formatListing', () => {
  expect(formatListing([])).toContain('No checkpoints')
  const m = buildManifest('Write', 0, [{ path: '/p/a.ts', existed: true }])
  expect(formatListing([{ id: 'x', manifest: m }])).toContain('a.ts')
})
