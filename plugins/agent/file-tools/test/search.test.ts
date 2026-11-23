import type { Tool, ToolContext } from '@sand/tools/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { z } from 'zod'
import { globTool } from '../src/glob'
import { grepTool } from '../src/grep'
import { readTool } from '../src/read'
import { ownRipgrep } from '../src/search/ripgrep'

const appRoot = join(import.meta.dir, '..', '..', '..', '..')
const ripgrep = ownRipgrep(appRoot)
const grep = grepTool(ripgrep)
const glob = globTool(ripgrep)

let cwd = ''

const run = <Input extends z.ZodType>(tool: Tool<Input>, input: z.infer<Input>) => {
  const context: ToolContext = {
    cwd,
    signal: new AbortController().signal,
    conversation: {
      id: 't1',
      owner: 'thread',
      cwd,
      append() {
        throw new Error('search does not append')
      },
      path: () => [],
      entries: () => [],
    },
    call: { type: 'tool_call', id: 'c1', name: tool.name, input },
    turn: 'turn1',
    progress: () => {},
    wait: () => () => {},
  }
  return tool.run(input, context)
}

beforeAll(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'sand-search-'))
  await mkdir(join(cwd, 'src'))
  await writeFile(join(cwd, 'src', 'main.ts'), 'const greeting = "hello"\n')
  await mkdir(join(cwd, 'notes'))
  await writeFile(join(cwd, 'notes', 'words.txt'), 'alpha\nbeta\ngamma\ndelta\n')
})

afterAll(() => rm(cwd, { recursive: true, force: true }))

test('search and glob run the ripgrep that comes with sand, not one on PATH', async () => {
  expect(await ripgrep()).toStartWith(join(appRoot, 'ripgrep'))
  expect(await run(grep, { pattern: 'greet' })).toBe('src/main.ts:1: const greeting = "hello"')
  expect(await run(grep, { pattern: 'hello', path: 'src/main.ts' })).toBe('main.ts:1: const greeting = "hello"')
  expect(await run(glob, { pattern: '**/*.ts' })).toBe('src/main.ts')
})

test('without sand\'s ripgrep, search and glob say it is missing', async () => {
  const missing = ownRipgrep(cwd)
  await expect(run(grepTool(missing), { pattern: 'x' })).rejects.toThrow("Sand's ripgrep is missing")
  await expect(run(globTool(missing), { pattern: '**/*' })).rejects.toThrow("Sand's ripgrep is missing")
})

test('search shows context lines, matching files or counts per file', async () => {
  expect(await run(grep, { pattern: 'gamma', context: 1 })).toBe(['notes/words.txt:2- beta', 'notes/words.txt:3: gamma', 'notes/words.txt:4- delta'].join('\n'))
  const files = await run(grep, { pattern: 'l', output: 'files' })
  expect(typeof files === 'string' && files.split('\n').sort()).toEqual(['notes/words.txt', 'src/main.ts'])
  expect(await run(grep, { pattern: 'a$', path: 'notes', output: 'count' })).toBe('words.txt: 4')
})

test('read lists a folder, marking subfolders with a slash', async () => {
  const read = readTool(() => ({ isMedia: () => false, fromFile: () => Promise.reject(), fromBytes: () => Promise.reject() }))
  expect(await run(read, { path: '.' })).toBe('notes/\nsrc/')
  expect(await run(read, { path: 'src' })).toBe('main.ts')
})

test('search and glob in a missing folder name the folder', async () => {
  const missing = join(cwd, 'gone', 'deeper')
  await expect(run(grep, { pattern: 'x', path: missing })).rejects.toThrow(`No such folder: ${missing}`)
  await expect(run(glob, { pattern: '**/*', path: missing })).rejects.toThrow(`No such folder: ${missing}`)
})
