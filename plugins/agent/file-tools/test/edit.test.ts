import type { ToolContext } from '@sand/tools/contract'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { edit } from '../src/edit'

let cwd = ''

const run = (edits: { path: string; old_string: string; new_string: string; replace_all?: boolean }[]) => {
  const input = { edits }
  const context: ToolContext = {
    cwd,
    signal: new AbortController().signal,
    conversation: {
      id: 't1',
      owner: 'thread',
      cwd,
      append() {
        throw new Error('edit does not append')
      },
      path: () => [],
      entries: () => [],
    },
    call: { type: 'tool_call', id: 'c1', name: 'edit', input },
    turn: 'turn1',
    progress: () => {},
    wait: () => () => {},
  }
  return edit.run(input, context)
}

const text = (name: string) => readFile(join(cwd, name), 'utf8')

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'edit-'))
  await writeFile(join(cwd, 'a.ts'), 'one\ntwo\nthree\n')
  await writeFile(join(cwd, 'b.ts'), 'alpha\r\nbeta\r\n')
})

afterEach(() => rm(cwd, { recursive: true, force: true }))

test('applies changes across files in one call, in order within a file, keeping line endings', async () => {
  const result = await run([
    { path: 'a.ts', old_string: 'two', new_string: '2' },
    { path: 'b.ts', old_string: 'alpha\nbeta', new_string: 'A\nB' },
    { path: 'a.ts', old_string: '2\nthree', new_string: 'done' },
  ])
  expect(await text('a.ts')).toBe('one\ndone\n')
  expect(await text('b.ts')).toBe('A\r\nB\r\n')
  expect(result).toBe(['Replaced 1 occurrence in a.ts at line 2', 'Replaced 1 occurrence in b.ts at line 1', 'Replaced 1 occurrence in a.ts at line 2'].join('\n'))
})

test('changes no file when any change fails', async () => {
  await expect(
    run([
      { path: 'a.ts', old_string: 'one', new_string: '1' },
      { path: 'b.ts', old_string: 'missing', new_string: 'x' },
    ]),
  ).rejects.toThrow('Edit 2 of 2: old_string not found in b.ts. No files were changed.')
  expect(await text('a.ts')).toBe('one\ntwo\nthree\n')
})

test('keeps every byte outside the replaced text in any encoding, and refuses text the encoding cannot hold', async () => {
  const latin1 = (text: string) => Buffer.from(text, 'latin1')
  await writeFile(join(cwd, 'a.ts'), latin1('a \xB7 b\nold\n'))
  await writeFile(join(cwd, 'b.ts'), '\uFEFFold ·')
  await run([
    { path: 'a.ts', old_string: 'old', new_string: 'new' },
    { path: 'b.ts', old_string: 'old', new_string: 'new' },
  ])
  expect(await readFile(join(cwd, 'a.ts'))).toEqual(latin1('a \xB7 b\nnew\n'))
  expect(await readFile(join(cwd, 'b.ts'))).toEqual(Buffer.from('\uFEFFnew ·'))
  await expect(run([{ path: 'a.ts', old_string: 'new', new_string: '→' }])).rejects.toThrow('No files were changed')
  expect(await readFile(join(cwd, 'a.ts'))).toEqual(latin1('a \xB7 b\nnew\n'))
})

test('needs replace_all for text found more than once', async () => {
  await writeFile(join(cwd, 'a.ts'), 'x x')
  await expect(run([{ path: 'a.ts', old_string: 'x', new_string: 'y' }])).rejects.toThrow('old_string matches 2 times in a.ts')
  expect(await run([{ path: 'a.ts', old_string: 'x', new_string: 'y', replace_all: true }])).toBe('Replaced 2 occurrences in a.ts')
  expect(await text('a.ts')).toBe('y y')
})
