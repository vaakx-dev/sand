import { gitRunner } from '@sand/git-runner/contract'
import { startSand } from '@sand/harness'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { filesGrep, filesList, filesRead } from '../src/contract'

const model = { id: 'fake', models: ['m'], replies: [] }
const othersOff = ['bots', 'notifications', 'updates'].map(id => `${id} = false`)

const boot = (chosen: string[]) => startSand([model], { config: `[features]\n${[...othersOff, ...chosen].join('\n')}` })

const folder = mkdtempSync(join(tmpdir(), 'sand-project-files-'))

const write = (path: string, text: string) => {
  mkdirSync(join(folder, path, '..'), { recursive: true })
  writeFileSync(join(folder, path), text)
}

beforeAll(() => {
  write('src/main.ts', 'export const greeting = "Hello Sand"\n')
  write('notes/ignored.txt', 'hello from an ignored file\n')
  write('.gitignore', 'notes/\nnode_modules/\n')
  write('node_modules/pkg/index.js', 'hello from a dependency\n')
  write('bin/blob.dat', 'hello\0binary')
  Bun.spawnSync(['git', 'init', '-q'], { cwd: folder })
})

afterAll(() => rmSync(folder, { recursive: true, force: true }))

describe('without git', () => {
  test('files list, grep and read with no git runner', async () => {
    const sand = await boot([])
    try {
      expect(sand.problems()).toEqual([])
      expect(sand.app.get(gitRunner)).toBeUndefined()
      expect((await sand.ask(filesList, { cwd: folder })).sort()).toEqual(['.gitignore', 'bin/blob.dat', 'notes/ignored.txt', 'src/main.ts'])
      const matches = await sand.ask(filesGrep, { cwd: folder, query: 'HELLO' })
      expect(matches.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
        { path: 'notes/ignored.txt', line: 1, text: 'hello from an ignored file' },
        { path: 'src/main.ts', line: 1, text: 'export const greeting = "Hello Sand"' },
      ])
      expect(await sand.ask(filesRead, { cwd: folder, path: 'src/main.ts' })).toMatchObject({ text: 'export const greeting = "Hello Sand"\n' })
    } finally {
      await sand.stop()
    }
  })
})

describe.if(Boolean(Bun.which('git')))('with git', () => {
  test('files list and grep skip what .gitignore ignores', async () => {
    const sand = await boot(['git = true'])
    try {
      expect(sand.app.get(gitRunner)).toBeDefined()
      expect((await sand.ask(filesList, { cwd: folder })).sort()).toEqual(['.gitignore', 'bin/blob.dat', 'src/main.ts'])
      expect((await sand.ask(filesGrep, { cwd: folder, query: 'hello' })).map(match => match.path)).toEqual(['src/main.ts'])
    } finally {
      await sand.stop()
    }
  })
})
