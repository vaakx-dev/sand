import { botCreate } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { z } from 'zod'

let sand: Sand

afterEach(() => sand.stop())

const fake = (name: string) => ({ name, description: name, always: ['bot', 'thread'] as ('bot' | 'thread')[], input: z.object({}), run: () => 'ok' })

test('a bot may only use the tools of a project lead, while threads keep all of theirs', async () => {
  sand = await startSand([], { plugins: ['bots/bots', 'bots/turns'] })
  const registry = sand.app.get(tools)!
  for (const name of ['memory', 'agent', 'shell', 'file', 'thread_wait', 'job_wait', 'thread_start']) registry.register(fake(name))
  const bot = sand.sessions.require((await sand.ask(botCreate, { name: 'Lead' })).id)

  const forBot = registry.names(bot)
  expect(forBot).toContain('memory')
  expect(forBot).toContain('agent')
  for (const name of ['shell', 'file', 'thread_wait', 'job_wait', 'thread_start']) expect(forBot).not.toContain(name)
  expect(registry.names(sand.chat('fake/m'))).toEqual(expect.arrayContaining(['memory', 'agent', 'shell', 'file', 'thread_wait']))
})
