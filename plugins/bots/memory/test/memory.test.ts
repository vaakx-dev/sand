import { botMemorySpace } from '@sand/bot-memory/contract'
import { botCreate, botDelete, botList } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import { memory as memoryService, memoryLimit, memoryNoteWrite, memoryRead, memoryWrite } from '@sand/memory/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let sand: Sand

const memory = () => sand.app.get(memoryService)!

const mine = (bot: string) => ({ space: botMemorySpace, id: bot })

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const overflow = { type: 'error', message: 'prompt is too long' } as const

const start = (replies: Source['replies']) =>
  startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }], { plugins: ['agent/memory', 'bots/bots', 'bots/memory', 'bots/turns'] })

const talk = async (bot: string, prompt: string) => {
  const before = sand.requests('fake').length
  await sand.turns.send(sand.sessions.require(bot), { prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 300; tries++) {
    const found = (await sand.ask(botList, {})).find(listed => listed.id === bot)
    if (sand.requests('fake').length > before && found?.status === 'idle' && found.last?.role === 'assistant') return
    await Bun.sleep(10)
  }
  throw new Error(`${prompt} never got an answer`)
}

const bodies = () => sand.requests('fake').map(body => JSON.parse(body))

const summary = '## Working on\n- Booking lunch with Ana on Friday'

const remembered = '## The user\n- Lives in Lisbon.\n\n## Preferences and rules\n- No meetings before 10.'

test("a bot's memory and notes are Markdown files in its folder that the user can read and write", async () => {
  sand = await start([])
  const bot = await sand.ask(botCreate, { name: 'Calendar' })
  expect((await sand.ask(memoryRead, mine(bot.id))).text).toBe('')

  await sand.ask(memoryWrite, { ...mine(bot.id), text: '## People\n- Ana likes early meetings.\n' })
  const path = join(sand.home, 'bots', bot.id, 'memory.md')
  expect(await Bun.file(path).text()).toBe('## People\n- Ana likes early meetings.\n')
  expect((await sand.ask(memoryRead, mine(bot.id))).text).toBe('## People\n- Ana likes early meetings.\n')
  await expect(sand.ask(memoryRead, mine('nobody'))).rejects.toThrow('No bot nobody')
  await expect(memory().write(mine(bot.id), 'x'.repeat(memoryLimit + 1))).rejects.toThrow(`over its ${memoryLimit} limit`)

  await sand.ask(memoryNoteWrite, { ...mine(bot.id), name: 'ana', text: 'Ana prefers mornings.' })
  expect(await Bun.file(join(sand.home, 'bots', bot.id, 'notes', 'ana.md')).text()).toBe('Ana prefers mornings.')
  expect((await sand.ask(memoryRead, mine(bot.id))).notes).toEqual([{ name: 'ana', text: 'Ana prefers mornings.' }])
  await sand.ask(memoryNoteWrite, { ...mine(bot.id), name: 'ana', text: '' })
  expect((await sand.ask(memoryRead, mine(bot.id))).notes).toEqual([])

  await sand.ask(botDelete, { bot: bot.id })
  expect(existsSync(path)).toBe(false)
})

test("a bot's notes are Markdown files in its notes folder, removed when emptied", async () => {
  sand = await start([])
  const bot = await sand.ask(botCreate, { name: 'Ops' })
  expect(await memory().notes(mine(bot.id))).toEqual([])

  await memory().writeNote(mine(bot.id), { name: 'deploys', text: 'How deploys go.\n- Staging first.\n' })
  const path = join(sand.home, 'bots', bot.id, 'notes', 'deploys.md')
  expect(await Bun.file(path).text()).toBe('How deploys go.\n- Staging first.\n')
  expect(await memory().notes(mine(bot.id))).toEqual([{ name: 'deploys', text: 'How deploys go.\n- Staging first.\n' }])
  await expect(memory().writeNote(mine(bot.id), { name: '../memory', text: 'x' })).rejects.toThrow()

  await memory().writeNote(mine(bot.id), { name: 'deploys', text: '' })
  expect(existsSync(path)).toBe(false)
})

test('a bot lists its notes in its instructions by first line and finds the paragraphs that match a search', async () => {
  const note = 'How deploys go and what broke them.\n\n## Rollback\n- A failed migration needs a manual rollback.\n'
  const lookup = { type: 'call', name: 'memory', input: { command: 'search', query: 'rollback migration' } } as const
  sand = await start([[lookup], [said('Rolled back.')]])
  const bot = await sand.ask(botCreate, { name: 'Ops' })
  await memory().writeNote(mine(bot.id), { name: 'deploys', text: note })

  await talk(bot.id, 'Roll it back')

  const [first, after] = bodies()
  expect(first.system[0].text).toContain('- /memories/notes/deploys.md: How deploys go and what broke them.')
  expect(first.system[0].text).not.toContain('manual rollback')
  expect(after.messages.at(-1).content[0].content[0].text).toBe('/memories/notes/deploys.md:\n## Rollback\n- A failed migration needs a manual rollback.')
})

test('a bot writes its memory with the memory tool mid-chat; the prompt it is sending stays the same until it compacts', async () => {
  const save = { type: 'call', name: 'memory', input: { command: 'create', path: '/memories/memory.md', file_text: remembered } } as const
  sand = await start([[save], [said('Saved.')], [said('Booked.')], [overflow], [said(summary)], [said('Done.')]])
  const bot = await sand.ask(botCreate, { name: 'Calendar' })

  await talk(bot.id, 'Remember: no meetings before 10.')
  await talk(bot.id, 'Book lunch with Ana on Friday')
  await talk(bot.id, 'And dinner')

  const [first, , second, , , next] = bodies()
  expect((await sand.ask(memoryRead, mine(bot.id))).text).toBe(remembered)
  expect(second.system).toEqual(first.system)
  expect(second.system[0].text).not.toContain('No meetings before 10.')
  expect(next.system[0].text).toContain(`<memory>
${remembered}
</memory>`)
})
