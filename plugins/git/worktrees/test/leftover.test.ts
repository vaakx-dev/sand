import { expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { clearLeftover } from '../src/remove/leftover'

test('clearing a leftover worktree folder removes its links without touching their targets', async () => {
  const root = mkdtempSync(join(tmpdir(), 'leftover-'))
  try {
    const outside = join(root, 'outside')
    mkdirSync(outside)
    writeFileSync(join(outside, 'keep.txt'), 'keep')
    const left = join(root, 'tree')
    mkdirSync(join(left, 'node_modules'), { recursive: true })
    writeFileSync(join(left, 'file.txt'), 'x')
    symlinkSync(outside, join(left, 'node_modules', 'pkg'), 'junction')
    await clearLeftover(left)
    expect(existsSync(left)).toBe(false)
    expect(existsSync(join(outside, 'keep.txt'))).toBe(true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
