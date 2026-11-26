import { botColors, botCreate, botDelete, botList, botUpdate, freshColor } from '@sand/bots/contract'
import type { Message } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
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
  const { ask, home, sessions } = await start()
  const bot = await ask(botCreate, { name: 'calendar' })
  expect(bot).toMatchObject({ name: 'calendar', initial: 'C', color: 'gold', computer: 'none', projects: [], status: 'idle' })
  expect(await ask(botList, {})).toEqual([bot])

  const updated = await ask(botUpdate, { bot: bot.id, patch: { color: 'sky', computer: 'pc:laptop', projects: ['veld', 'orchard', 'veld'] } })
  expect(updated).toMatchObject({ color: 'sky', computer: 'pc:laptop', projects: ['veld', 'orchard'] })
  expect(updated.updated).toBeGreaterThanOrEqual(bot.updated)
  await expect(ask(botUpdate, { bot: bot.id, patch: { computer: 'somewhere' as 'own' } })).rejects.toThrow('Invalid input')
  await expect(ask(botUpdate, { bot: bot.id, patch: { computer: 'none' as 'own' } })).rejects.toThrow('Invalid input')
  await expect(ask(botUpdate, { bot: bot.id, patch: { projects: [''] } })).rejects.toThrow('Invalid input')
  expect(await ask(botUpdate, { bot: bot.id, patch: { projects: [] } })).toMatchObject({ projects: [] })

  const folder = join(home, 'bots', bot.id)
  expect(existsSync(folder)).toBe(true)
  expect(await ask(botDelete, { bot: bot.id })).toBe(true)
  expect(existsSync(folder)).toBe(false)
  expect(sessions.open(bot.id)).toBeUndefined()
  expect((await ask(botList, {})).find(listed => listed.id === bot.id)).toBeUndefined()
  expect(await ask(botDelete, { bot: bot.id })).toBe(false)
})

const said = (role: Message['role'], text: string): Message => ({ role, content: [{ type: 'text', text }] })

test("a bot's chat is a bot session in its folder, and its newest line shows on the bot", async () => {
  const { ask, sessions } = await start()
  const first = await ask(botCreate, { name: 'Researcher' })
  const second = await ask(botCreate, { name: 'Errands' })
  const chat = sessions.require(first.id)
  expect(chat).toMatchObject({ kind: 'bot', owner: 'bot', cwd: first.folder, project: null })
  for (const text of ['one', 'two', 'three']) chat.append('message', said('user', text))
  chat.append('message', said('assistant', '**Noted**,\n- all `three`, see [notes](https://example.com).'))

  const listed = await ask(botList, {})
  expect(listed.find(bot => bot.id === first.id)?.last).toMatchObject({ role: 'assistant', text: 'Noted, all three, see notes.' })
  expect(listed.find(bot => bot.id === second.id)?.last).toBeUndefined()
})

test('a bot without a computer takes this PC with its first message and keeps the one it has after that', async () => {
  const { ask, sessions } = await start()
  const unset = await ask(botCreate, { name: 'Errands' })
  const placed = await ask(botCreate, { name: 'Shopper', computer: 'own' })
  const computers = async () => Object.fromEntries((await ask(botList, {})).map(bot => [bot.name, bot.computer]))
  expect(await computers()).toEqual({ Errands: 'none', Shopper: 'own' })

  for (const bot of [unset, placed]) sessions.require(bot.id).append('message', said('user', 'Book a table for two'))
  expect(await computers()).toEqual({ Errands: 'this-pc', Shopper: 'own' })

  await ask(botUpdate, { bot: unset.id, patch: { computer: 'pc:laptop' } })
  sessions.require(unset.id).append('message', said('user', 'Make it three'))
  expect(await computers()).toEqual({ Errands: 'pc:laptop', Shopper: 'own' })
})

test('bots and their chats survive a restart', async () => {
  shared = mkdtempSync(join(tmpdir(), 'sand-bots-'))
  const before = await start(shared)
  const bot = await before.ask(botCreate, { name: 'Calendar', color: 'green' })
  before.sessions.require(bot.id).append('message', said('user', 'Lunch with Ana on Friday'))
  await before.stop()

  const after = await start(shared)
  expect(await after.ask(botList, {})).toEqual([expect.objectContaining({ id: bot.id, color: 'green', last: expect.objectContaining({ text: 'Lunch with Ana on Friday' }) })])
  expect(after.sessions.require(bot.id).messages()).toEqual([said('user', 'Lunch with Ana on Friday')])
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
