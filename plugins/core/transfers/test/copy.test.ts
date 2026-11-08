import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transfers, transfersOffer, transfersSave } from '../src/contract'

const posix = process.platform !== 'win32'

const canLink = (() => {
  const folder = mkdtempSync(join(tmpdir(), 'sand-link-'))
  try {
    symlinkSync('target', join(folder, 'link'))
    return true
  } catch {
    return false
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
})()

let sand: Sand

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins: ['core/transfers'] })
})

afterAll(() => sand.stop())

const write = (path: string, text: string, mode = 0o644) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text)
  chmodSync(path, mode)
}

const copy = async (from: string, to: string, files?: string[]) => {
  const ask = sand.askAs({ device: 'other-pc', kind: 'pc' })
  const offered = await ask(transfersOffer, { path: from, ...(files && { files }) })
  await ask(transfersSave, { ...offered, path: to })
}

const tree = (folder: string) => readdirSync(folder, { recursive: true, encoding: 'utf8' }).map(path => path.replaceAll('\\', '/')).sort()

test('a folder copy keeps every file, empty folders, long and non-ASCII names, and exec bits', async () => {
  const from = join(sand.home, 'kept')
  const deep = `${'nested-folder/'.repeat(9)}a-file-whose-path-is-longer-than-a-tar-name.txt`
  write(join(from, 'run.sh'), '#!/bin/sh\necho hi\n', 0o755)
  write(join(from, 'notes.txt'), 'notes\n')
  write(join(from, deep), 'deep\n')
  write(join(from, 'café/menü.md'), 'unicode\n')
  mkdirSync(join(from, '.git', 'refs', 'tags'), { recursive: true })

  const to = join(sand.home, 'kept-copy')
  await copy(from, to)
  expect(tree(to)).toEqual(tree(from))
  expect(readFileSync(join(to, deep), 'utf8')).toBe('deep\n')
  expect(readFileSync(join(to, 'café/menü.md'), 'utf8')).toBe('unicode\n')
  if (posix) {
    expect(statSync(join(to, 'run.sh')).mode & 0o777).toBe(0o755)
    expect(statSync(join(to, 'notes.txt')).mode & 0o111).toBe(0)
  }
})

test('a copy of chosen files under a folder sends only those, whole folders included', async () => {
  const from = join(sand.home, 'chosen')
  write(join(from, 'src/a.ts'), 'a\n')
  write(join(from, 'src/b.ts'), 'b\n')
  write(join(from, '.env'), 'SECRET=1\n')
  write(join(from, 'node_modules/pkg/index.js'), 'x\n')

  const to = join(sand.home, 'chosen-copy')
  await copy(from, to, ['src', '.env', 'missing.txt'])
  expect(tree(to)).toEqual(['.env', 'src', 'src/a.ts', 'src/b.ts'])
  await expect(copy(from, join(sand.home, 'escape'), ['../chosen'])).rejects.toThrow('is not inside')
})

test.if(canLink)('links are copied as links with their targets as stored, never followed', async () => {
  const from = join(sand.home, 'linked')
  const outside = join(sand.home, 'outside.txt')
  write(outside, 'outside\n')
  write(join(from, 'run.sh'), 'run\n', 0o755)
  write(join(from, 'sub/inner.txt'), 'inner\n')
  symlinkSync('run.sh', join(from, 'run-link'))
  symlinkSync(outside, join(from, 'outside-link'))
  symlinkSync('sub', join(from, 'sub-link'), 'dir')
  symlinkSync('gone.txt', join(from, 'dangling'))

  const to = join(sand.home, 'linked-copy')
  await copy(from, to)
  expect(readlinkSync(join(to, 'run-link'))).toBe('run.sh')
  expect(readlinkSync(join(to, 'outside-link'))).toBe(outside)
  expect(readlinkSync(join(to, 'sub-link'))).toBe('sub')
  expect(readlinkSync(join(to, 'dangling'))).toBe('gone.txt')
  expect(['run-link', 'outside-link', 'sub-link', 'dangling'].filter(link => lstatSync(join(to, link)).isSymbolicLink())).toHaveLength(4)
  if (posix) expect(statSync(join(to, 'run.sh')).mode & 0o777).toBe(0o755)
  expect(tree(to)).toEqual(tree(from))
})

const linkArchive = (name: string, target: string) => {
  const header = new Uint8Array(512)
  const put = (offset: number, text: string) => header.set(new TextEncoder().encode(text), offset)
  put(0, name)
  put(100, '0000777\u0000')
  put(124, '00000000000\u0000')
  put(136, '00000000000\u0000')
  put(156, '2')
  put(157, target)
  put(257, 'ustar\u000000')
  header.fill(32, 148, 156)
  put(148, `${header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0')}\u0000 `)
  return new Uint8Array([...header, ...new Uint8Array(1024)])
}

test.if(!canLink)("a link this PC can't create fails the copy with a clear reason", async () => {
  const archive = join(sand.home, 'link.tar')
  writeFileSync(archive, linkArchive('run-link', 'run.sh'))
  const store = sand.app.get(transfers)
  if (!store) throw new Error('transfers did not start')
  const to = join(sand.home, 'unlinked')
  await expect(store.savePath({ ...store.offer(archive), folder: true, path: to })).rejects.toThrow("Couldn't create the link run-link")
  expect(existsSync(join(to, 'run-link'))).toBe(false)
})
