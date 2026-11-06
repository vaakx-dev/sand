import { memoryList, memoryRead, memoryRemove, memoryWrite } from '@sand/bot-memory/contract'
import { botCreate, botDelete } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

test("a bot's memory is Markdown files in its folder that can be written, read, listed and removed", async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins: ['bots/bots', 'bots/memory'] })
  const { ask, home } = sand
  const bot = await ask(botCreate, { name: 'Calendar' })
  expect(await ask(memoryList, { bot: bot.id })).toEqual([])

  const files = await ask(memoryWrite, { bot: bot.id, name: 'people.md', text: '# People\n\nAna likes early meetings.\n' })
  expect(files).toEqual([{ name: 'people.md', size: 36, updated: expect.any(Number) }])
  const path = join(home, 'bots', bot.id, 'memory', 'people.md')
  expect(await Bun.file(path).text()).toBe('# People\n\nAna likes early meetings.\n')
  expect(await ask(memoryRead, { bot: bot.id, name: 'people.md' })).toBe('# People\n\nAna likes early meetings.\n')

  await ask(memoryWrite, { bot: bot.id, name: 'habits.md', text: 'Gym on Mondays.' })
  expect((await ask(memoryList, { bot: bot.id })).map(file => file.name)).toEqual(['habits.md', 'people.md'])
  expect((await ask(memoryRemove, { bot: bot.id, name: 'habits.md' })).map(file => file.name)).toEqual(['people.md'])

  await expect(ask(memoryWrite, { bot: bot.id, name: '../escape.md', text: '' })).rejects.toThrow('Invalid input')
  await expect(ask(memoryWrite, { bot: bot.id, name: 'notes.txt', text: '' })).rejects.toThrow('Invalid input')
  await expect(ask(memoryList, { bot: 'nobody' })).rejects.toThrow('No bot nobody')

  await ask(botDelete, { bot: bot.id })
  expect(existsSync(path)).toBe(false)
})
