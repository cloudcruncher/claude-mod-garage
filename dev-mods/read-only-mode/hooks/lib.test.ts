import { expect, test } from 'claude-code/testing'
import { isReadOnlyCommand as ro } from './lib'

test('allows plain reads and read-only git', () => {
  for (const c of ['ls -la', 'cat a.txt | grep foo | wc -l', 'git status', 'git log --oneline -5', 'git diff HEAD', 'git branch', 'git branch -a', 'find . -name "*.ts"'])
    expect([c, ro(c)]).toEqual([c, true])
})

test('refuses writes, redirects and unknown commands', () => {
  for (const c of ['rm -rf x', 'echo hi > f', 'git commit -m x', 'git push', 'git branch -D x', 'git branch newfeature', 'find . -delete', 'sed -i s/a/b/ f', 'npm install', 'cat a && rm b', 'echo $(rm x)', ''])
    expect([c, ro(c)]).toEqual([c, false])
})
