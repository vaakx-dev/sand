import { startSand, type Sand } from '@sand/harness'
import { scriptEntry } from '@sand/scripts/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { filesFind } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

const write = async (home: string, path: string, text: string) => {
  mkdirSync(join(home, path, '..'), { recursive: true })
  await Bun.write(join(home, path), text)
}

test('a file the agent names after changing folder, by name alone or with a line number, is found in the thread', async () => {
  sand = await startSand([
    {
      id: 'fake',
      api: 'anthropic',
      models: ['m'],
      replies: [[{ type: 'call', name: 'shell', input: { command: 'cd tools/gauge && ls' } }], [{ type: 'text', text: 'See `reading.py` and `log.txt`.' }]],
    },
  ], { plugins: ['ui/files/viewer'] })
  sand.tool('shell', () => 'reading.py')
  const { home } = sand
  await write(home, 'tools/gauge/reading.py', 'high = 4.8\n')
  await write(home, 'notes/week32/log.txt', 'cleaned the gauge\n')
  await write(home, 'old/reading.py', 'high = 3.9\n')
  const chat = sand.chat('fake/m')
  await sand.turns.run(chat, 'look at the gauge code')

  const found = async (mention: string) => {
    const answer = await sand.ask(filesFind, { thread: chat.id, mention })
    return 'file' in answer ? answer.file.path : undefined
  }

  expect(await found('reading.py')).toBe(join(home, 'tools', 'gauge', 'reading.py'))
  expect(await found('reading.py:1')).toBe(join(home, 'tools', 'gauge', 'reading.py'))
  expect(await found('log.txt')).toBe(join(home, 'notes', 'week32', 'log.txt'))
  expect(await found('week32/log.txt')).toBe(join(home, 'notes', 'week32', 'log.txt'))
  expect(await found('missing.md')).toBeUndefined()
})

test('a file in a folder a script changed into is found in the thread', async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[{ type: 'text', text: 'See `reading.py`.' }]] }], { plugins: ['ui/files/viewer'] })
  await write(sand.home, 'tools/gauge/reading.py', 'high = 4.8\n')
  await write(sand.home, 'old/reading.py', 'high = 3.9\n')
  const chat = sand.chat('fake/m')
  await sand.turns.run(chat, 'look at the gauge code')
  const call = { type: 'tool_call', id: 's1.0', name: 'shell', input: { command: 'cd tools/gauge && ls' } } as const
  chat.append(scriptEntry, { id: 's1', thread: chat.id, title: 'look', code: '', status: 'done', started: 0, calls: [{ call }] })

  const answer = await sand.ask(filesFind, { thread: chat.id, mention: 'reading.py' })
  expect('file' in answer && answer.file.path).toBe(join(sand.home, 'tools', 'gauge', 'reading.py'))
})
