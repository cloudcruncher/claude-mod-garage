import { test, expect } from 'claude-code/testing'
import {
  secretPathReason, findSecret, addedLines, gitOps, pushDenyReason, isBroadStage, shannonEntropy,
} from './lib.ts'

// Fake secrets are assembled at runtime so no literal secret sits in this file.
const rand = (n: number, alphabet = 'aB3dE9fG1hJ7kLmN5pQ2rS8tUvW4xYz0'): string => {
  let out = ''
  for (let i = 0; i < n; i++) out += alphabet[(i * 7 + (i % 5) * 3 + 1) % alphabet.length]
  return out
}
const aws = ['AK', 'IA'].join('') + 'ABCDEFGH12345678'
const ghp = ['gh', 'p_'].join('') + rand(36)
const pat = ['github', '_pat_'].join('') + rand(40)
const ant = ['sk', '-ant-'].join('') + rand(40)
const sk = ['sk', '-'].join('') + rand(40)
const pem = ['-----BEGIN', ' RSA PRIVATE', ' KEY-----'].join('')

test('secretPathReason denies secret files, allows examples', () => {
  for (const p of ['/p/.env', '/p/.env.local', '/p/.env.production', 'a/b/key.pem', '/h/.ssh/id_rsa',
    '/h/.ssh/id_ed25519', '/p/credentials.json', '/h/.aws/credentials', '/p/.git-credentials']) {
    expect(secretPathReason(p)).toBeDefined()
  }
  for (const p of ['/p/.env.example', '/p/.env.sample', '/p/.env.template', '/p/src/env.ts',
    '/h/.ssh/id_rsa.pub', '/p/README.md', '/p/credentials-guide.md', '/p/identity.ts']) {
    expect(secretPathReason(p)).toBeUndefined()
  }
})

test('findSecret positives', () => {
  expect(findSecret(`key = ${aws}`)).toContain('AWS')
  expect(findSecret(`export T=${ghp}`)).toContain('GitHub')
  expect(findSecret(pat)).toContain('GitHub')
  expect(findSecret(`x ${ant}`)).toContain('Anthropic')
  expect(findSecret(`OPENAI=${sk}`)).toBeDefined()
  expect(findSecret(pem)).toContain('private key')
  expect(findSecret(`api_key = "${rand(40, 'aB3dE9fG1hJ7kLmN5pQ2rS8tUvW4xYz0AbCdEf')}"`)).toContain('high-entropy')
})

test('findSecret negatives', () => {
  expect(findSecret('const x = 1')).toBeUndefined()
  expect(findSecret('git commit -m "fix the login flow"')).toBeUndefined()
  expect(findSecret('API_KEY=your_api_key_here_please_change')).toBeUndefined()
  expect(findSecret('token = process.env.GITHUB_TOKEN_VALUE_FROM_ENV')).toBeUndefined()
  expect(findSecret('password = "aaaaaaaaaaaaaaaaaaaaaaaaaaaa"')).toBeUndefined()
  expect(findSecret('AKIA is a prefix')).toBeUndefined()
  expect(findSecret('sk-short')).toBeUndefined()
  expect(shannonEntropy('aaaa')).toBe(0)
})

test('addedLines keeps only additions', () => {
  const d = '+++ b/f\n+new line\n-old line\n context\n+second'
  expect(addedLines(d)).toBe('new line\nsecond')
})

test('gitOps finds operations in chains', () => {
  expect(gitOps('git add . && git commit -m "x"').map(o => o.kind)).toEqual(['add', 'commit'])
  expect(gitOps('git -C /r push origin main')[0]?.kind).toBe('push')
  expect(gitOps('ls && echo git')).toEqual([])
  expect(gitOps('git status')).toEqual([])
  expect(gitOps('git commit -m "a; b && c"')[0]?.args).toEqual(['-m', 'a; b && c'])
})

test('gitOps ignores git words inside heredocs and quoted text', () => {
  expect(gitOps("cat > doc.html <<'EOF'\n<p>run git commit -a</p>\ngit push origin main\nEOF")).toEqual([])
  expect(gitOps('echo "git add . && git push"')).toEqual([])
  expect(gitOps('grep -r "git commit" docs')).toEqual([])
})

test('pushDenyReason blocks main/master and force, allows feature branches', () => {
  expect(pushDenyReason(['origin', 'main'])).toBeDefined()
  expect(pushDenyReason(['origin', 'master'])).toBeDefined()
  expect(pushDenyReason(['origin', 'HEAD:main'])).toBeDefined()
  expect(pushDenyReason(['origin', 'HEAD:refs/heads/main'])).toBeDefined()
  expect(pushDenyReason(['--force', 'origin', 'feat'])).toContain('force')
  expect(pushDenyReason(['-f', 'origin', 'feat'])).toContain('force')
  expect(pushDenyReason(['--force-with-lease', 'origin', 'feat'])).toContain('force')
  expect(pushDenyReason(['origin', '+feat'])).toContain('force')
  expect(pushDenyReason(['origin', 'feat'])).toBeUndefined()
  expect(pushDenyReason(['-u', 'origin', 'feature/main-menu'])).toBeUndefined()
  expect(pushDenyReason([], 'main')).toBeDefined()
  expect(pushDenyReason([], 'feat')).toBeUndefined()
  expect(pushDenyReason(['--all'])).toBeDefined()
})

test('pushDenyReason resolves HEAD to the current branch', () => {
  expect(pushDenyReason(['origin', 'HEAD'], 'main')).toBeDefined()
  expect(pushDenyReason(['origin', 'HEAD'], 'feat')).toBeUndefined()
  expect(pushDenyReason(['origin', 'HEAD:feat'], 'main')).toBeUndefined()
})

test('pushDenyReason: bare colon pushes all matching branches, even from a feature branch', () => {
  expect(pushDenyReason(['origin', ':'], 'feat')).toBeDefined()
  expect(pushDenyReason(['origin', ':'], 'feat', false)).toBeUndefined()
})

test('pushDenyReason fails closed when HEAD cannot be resolved', () => {
  expect(pushDenyReason([], undefined)).toBeDefined()
  expect(pushDenyReason(['origin'], undefined)).toBeDefined()
  expect(pushDenyReason(['origin', 'HEAD'], undefined)).toBeDefined()
  expect(pushDenyReason(['origin', 'feat'], undefined)).toBeUndefined()
  expect(pushDenyReason([], undefined, false)).toBeUndefined()
})

test('--mirror is refused even when blockMain is off', () => {
  expect(pushDenyReason(['--mirror', 'origin'], 'feat', false)).toContain('mirror')
})

test('gitOps joins relative cd paths', () => {
  expect(gitOps('cd /a && cd b && git push')[0]?.dirs).toEqual(['/a/b'])
  expect(gitOps('cd /a && cd /c && git push')[0]?.dirs).toEqual(['/c'])
  expect(gitOps('cd ~/x && git push')[0]?.dirs).toEqual(['~/x'])
})

test('pushDenyReason lets main through when blockMain is off, but not force', () => {
  expect(pushDenyReason(['origin', 'main'], 'main', false)).toBeUndefined()
  expect(pushDenyReason([], 'main', false)).toBeUndefined()
  expect(pushDenyReason(['--all'], undefined, false)).toBeUndefined()
  expect(pushDenyReason(['--force', 'origin', 'main'], 'main', false)).toContain('force')
})

test('gitOps reports cd and git -C directories', () => {
  expect(gitOps('cd /repo/sub && git push origin main')[0]?.dirs).toEqual(['/repo/sub'])
  expect(gitOps('git -C /other commit -m x')[0]?.dirs).toEqual(['/other'])
  expect(gitOps('cd "/a b" && git -C c add .')[0]?.dirs).toEqual(['/a b', 'c'])
  expect(gitOps('git add .')[0]?.dirs).toBeUndefined()
  expect(gitOps('git add .')[0]?.kind).toBe('add')
})

test('isBroadStage', () => {
  expect(isBroadStage({ kind: 'add', args: ['.'] })).toBe(true)
  expect(isBroadStage({ kind: 'add', args: ['src/a.ts'] })).toBe(false)
  expect(isBroadStage({ kind: 'commit', args: ['-am', 'x'] })).toBe(true)
  expect(isBroadStage({ kind: 'commit', args: ['-m', 'x'] })).toBe(false)
})
