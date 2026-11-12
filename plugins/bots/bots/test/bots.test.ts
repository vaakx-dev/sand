import { botColors, botConversation, botCreate, botDelete, botList, bots, botUpdate, freshColor } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let sand: Sand | undefined
let shared: string | undefined

afterEach(async () => {
  await sand?.stop()
  sand = undefined
  if (shared) rmSync(shared, { recursive: true, force: true })
  shared = undefined
})

const start = async (home?: string) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { home, plugins: ['bots/bots'] })
  return sand
}

test('a bot is created with defaults, listed, updated and deleted along with its folder', async () => {
  const { ask, home } = await start()
  const bot = await ask(botCreate, { name: 'calendar', job: 'Keep my calendar.' })
  expect(bot).toMatchObject({ name: 'calendar', initial: 'C', color: 'gold', computer: 'none', projects: [], models: { main: {}, quick: {} }, status: 'idle' })
  expect(await ask(botList, {})).toEqual([bot])

  const updated = await ask(botUpdate, { bot: bot.id, patch: { color: 'sky', computer: 'pc:laptop', projects: ['veld', 'orchard', 'veld'], models: { main: { model: 'fake/m', effort: 'high' }, quick: {} } } })
  expect(updated).toMatchObject({ color: 'sky', computer: 'pc:laptop', projects: ['veld', 'orchard'], models: { main: { model: 'fake/m', effort: 'high' } } })
  expect(updated.updated).toBeGreaterThanOrEqual(bot.updated)
  await expect(ask(botUpdate, { bot: bot.id, patch: { computer: 'somewhere' as 'none' } })).rejects.toThrow('Invalid input')
  await expect(ask(botUpdate, { bot: bot.id, patch: { projects: [''] } })).rejects.toThrow('Invalid input')
  expect(await ask(botUpdate, { bot: bot.id, patch: { projects: [] } })).toMatchObject({ projects: [] })

  const folder = join(home, 'bots', bot.id)
  mkdirSync(folder, { recursive: true })
  expect(await ask(botDelete, { bot: bot.id })).toBe(true)
  expect(existsSync(folder)).toBe(false)
  expect((await ask(botList, {})).find(listed => listed.id === bot.id)).toBeUndefined()
  expect(await ask(botDelete, { bot: bot.id })).toBe(false)
})

test("a bot's messages land in its own conversation, page from the newest or catch up after an entry, and show as its last line", async () => {
  const { ask, app } = await start()
  const first = await ask(botCreate, { name: 'Researcher' })
  const second = await ask(botCreate, { name: 'Errands' })
  const conversation = app.get(bots)!.conversation(first.id)
  for (const text of ['one', 'two', 'three']) conversation.append('message', { role: 'user', content: [{ type: 'text', text }] })
  conversation.append('message', { role: 'assistant', content: [{ type: 'text', text: '**Noted**,\n- all `three`, see [notes](https://example.com).' }] })

  expect((await ask(botList, {})).find(listed => listed.id === first.id)?.last).toMatchObject({ role: 'assistant', text: 'Noted, all three, see notes.' })
  expect((await ask(botList, {})).find(listed => listed.id === second.id)?.last).toBeUndefined()

  const newest = await ask(botConversation, { bot: first.id, limit: 2 })
  expect(newest.more).toBe(true)
  expect(newest.entries.map(entry => entry.seq)).toEqual([3, 4])
  const older = await ask(botConversation, { bot: first.id, before: 3 })
  expect(older).toEqual({ entries: [expect.objectContaining({ seq: 1, data: { role: 'user', content: [{ type: 'text', text: 'one' }] } }), expect.objectContaining({ seq: 2 })], more: false })
  expect((await ask(botConversation, { bot: second.id })).entries).toEqual([])

  const caughtUp = await ask(botConversation, { bot: first.id, after: 2 })
  expect({ seqs: caughtUp.entries.map(entry => entry.seq), more: caughtUp.more }).toEqual({ seqs: [3, 4], more: false })
  const gapped = await ask(botConversation, { bot: first.id, after: 1, limit: 2 })
  expect({ seqs: gapped.entries.map(entry => entry.seq), more: gapped.more }).toEqual({ seqs: [3, 4], more: true })
})

test('bots and their conversations survive a restart', async () => {
  shared = mkdtempSync(join(tmpdir(), 'sand-bots-'))
  const before = await start(shared)
  const bot = await before.ask(botCreate, { name: 'Calendar', color: 'green' })
  before.app.get(bots)!.conversation(bot.id).append('message', { role: 'user', content: [{ type: 'text', text: 'Lunch with Ana on Friday' }] })
  await before.stop()

  const after = await start(shared)
  expect(await after.ask(botList, {})).toEqual([expect.objectContaining({ id: bot.id, color: 'green', last: expect.objectContaining({ text: 'Lunch with Ana on Friday' }) })])
  expect((await after.ask(botConversation, { bot: bot.id })).entries).toHaveLength(1)
})

test('a new bot takes a colour no other bot uses, then the least used, and can bring its own id', async () => {
  const { ask } = await start()
  const made = []
  for (const name of ['A', 'B', 'C', 'D', 'E', 'F']) made.push(await ask(botCreate, { name }))
  expect(made.map(bot => bot.color)).toEqual([...botColors])

  await ask(botUpdate, { bot: made[0]!.id, patch: { color: 'sky' } })
  expect((await ask(botCreate, { name: 'G' })).color).toBe('gold')
  expect((await ask(botCreate, { name: 'H', color: 'red' })).color).toBe('red')
  expect(freshColor([{ color: 'gold' }, { color: 'gold' }, { color: 'sky' }])).toBe('orange')

  const id = crypto.randomUUID()
  expect((await ask(botCreate, { id, name: 'Mine' })).id).toBe(id)
  await expect(ask(botCreate, { id, name: 'Again' })).rejects.toThrow('already exists')
})
