import type { Tool, ToolContext } from '@sand/tools/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { z } from 'zod'
import { globTool } from '../src/glob'
import { grepTool } from '../src/grep'
import { Ripgrep } from '../src/search/ripgrep'

const ripgrepFolder = join(tmpdir(), 'sand-test-ripgrep')
const ripgrep = new Ripgrep(ripgrepFolder)
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
})

afterAll(() => rm(cwd, { recursive: true, force: true }))

test('search and glob run the ripgrep sand downloads, not one on PATH', async () => {
  expect(await ripgrep.binary()).toStartWith(ripgrepFolder)
  expect(await run(grep, { pattern: 'greet' })).toBe('src/main.ts:1: const greeting = "hello"')
  expect(await run(grep, { pattern: 'hello', path: 'src/main.ts' })).toBe('main.ts:1: const greeting = "hello"')
  expect(await run(glob, { pattern: '**/*.ts' })).toBe('src/main.ts')
})

test('search and glob in a missing folder name the folder', async () => {
  const missing = join(cwd, 'gone', 'deeper')
  await expect(run(grep, { pattern: 'x', path: missing })).rejects.toThrow(`No such folder: ${missing}`)
  await expect(run(glob, { pattern: '**/*', path: missing })).rejects.toThrow(`No such folder: ${missing}`)
})
