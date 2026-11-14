import { botCreate, botDelete, bots } from '@sand/bots/contract'
import type { Message } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { removeFolder } from '@sand/util/fs'
import { afterEach, expect, setSystemTime, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type ChatHits, type Excerpt, type Found, messagesSearch } from '../src/contract'

let running: Sand[] = []
let home: string | undefined

afterEach(async () => {
  setSystemTime()
  await Promise.all(running.map(sand => sand.stop()))
  running = []
  if (home) await removeFolder(home)
  home = undefined
})

const start = async ({ plugins = ['agent/message-search'], replies = [], shared }: { plugins?: string[]; replies?: Reply[]; shared?: string } = {}) => {
  const sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }], { plugins: ['bots/bots', 'agent/mcp-server', ...plugins], home: shared })
  running.push(sand)
  return sand
}

const message = (role: Message['role'], text: string): Message => ({ role, content: [{ type: 'text', text }] })

const thread = (sand: Sand, title: string, said: Message[]) => {
  const session = sand.sessions.thread(sand.home)
  for (const one of said) session.append('message', one)
  sand.sessions.rename(session.id, title)
  return session
}

const HOUR_MS = 3_600_000

const titles = ({ chats }: Found) => chats.map(chat => chat.title)

const lines = ({ hits }: ChatHits) => hits.map(hit => hit.excerpt.text)

const marked = ({ text, marks }: Excerpt) => marks.map(([start, end]) => text.slice(start, end))

test('search finds words said in threads and bots as they arrive, words side by side first, then all words, then word starts, newest first in each', async () => {
  const sand = await start()
  const search = (query: string, more = {}) => sand.ask(messagesSearch, { query, ...more })
  const older = thread(sand, 'Older plan', [message('user', 'Is the release checklist ready?')])
  thread(sand, 'Words apart', [message('assistant', 'The checklist for the next release is long.')])
  thread(sand, 'Word starts', [message('user', 'Releases need checking first.')])
  sand.sessions.agent({ parent: older.id, cwd: sand.home, title: 'Helper' }).append('message', message('assistant', 'The release checklist, from a subagent.'))
  const newer = thread(sand, 'Newer plan', [message('assistant', 'Done.'), message('assistant', '## Release **checks** passed on main.')])
  const bot = await sand.ask(botCreate, { name: 'Errands' })
  sand.app.get(bots)!.conversation(bot.id).append('message', message('assistant', 'Your Release checklist is in the drawer.'))

  const found = await search('release check')
  expect(titles(found)).toEqual(['Errands', 'Newer plan', 'Older plan', 'Words apart', 'Word starts'])
  expect(found.chats.map(chat => chat.fit)).toEqual(['phrase', 'phrase', 'phrase', 'words', 'prefixes'])
  expect(found.chats[0]).toMatchObject({ owner: 'bot', chat: bot.id, matches: 1, hits: [{ role: 'assistant', block: 0, excerpt: { text: 'Your Release checklist is in the drawer.' } }] })
  expect(marked(found.chats[0]!.hits[0]!.excerpt)).toEqual(['Release', 'check'])
  expect(found.chats[1]).toMatchObject({ owner: 'thread', chat: newer.id, hits: [{ excerpt: { text: 'Release checks passed on main.' } }] })
  expect(found.indexing).toBeUndefined()

  expect(titles(await search('rÉlease chécklist', { owner: 'thread' }))).toEqual(['Older plan', 'Words apart'])
  await sand.sessions.remove(newer.id)
  await sand.ask(botDelete, { bot: bot.id })
  expect(titles(await search('release check'))).toEqual(['Older plan', 'Words apart', 'Word starts'])
})

test('chats rank by best fit, then different matching messages, whole words and newer matches, and show their best two different lines', async () => {
  const sand = await start()
  const nowMs = Date.now()
  const hoursAgo = (hours: number) => setSystemTime(new Date(nowMs - hours * HOUR_MS))
  hoursAgo(24 * 90)
  thread(sand, 'Old atlas', ['The tile grid', 'Tile seams at the poles', 'A tile per country', 'Every tile is square'].map(text => message('user', text)))
  hoursAgo(12)
  const steps = Array.from({ length: 30 }, (_, step) => message('user', `Step ${step + 1}: check the tile shader for the next layer.`))
  thread(sand, 'Shader layer review', steps)
  hoursAgo(2)
  const flicker = [
    'The tile renderer flickers when I zoom past level 14.',
    'Found it: the tile cache keys on zoom only, so each tile loads twice.',
    'The cache now holds about 12% more tiles at mixed ratios.',
  ]
  thread(sand, 'Tile renderer flicker', flicker.map(text => message('assistant', text)))
  hoursAgo(1)
  thread(sand, 'Floor plans', [message('user', 'Pick tiles for the bathroom floor.')])
  setSystemTime()

  const found = await sand.ask(messagesSearch, { query: 'tile' })
  expect(titles(found)).toEqual(['Tile renderer flicker', 'Shader layer review', 'Floor plans', 'Old atlas'])
  const [renderer, shader] = found.chats
  expect(lines(renderer!)).toEqual([flicker[1]!, flicker[0]!])
  expect(renderer!.matches).toBe(3)
  expect(lines(shader!)).toEqual(['Step 30: check the tile shader for the next layer.'])
  expect(shader!.matches).toBe(30)
})

test('a chat searched by id lists every match newest first, pages back, and the excerpt starts near where the words meet', async () => {
  const sand = await start()
  const search = (query: string, more = {}) => sand.ask(messagesSearch, { query, ...more })
  const filler = 'We walked along the river and talked about the weather for a long while before anything else came up. '
  const garden = sand.sessions.thread(sand.home)
  ;['first', 'second', 'third', 'fourth', 'fifth'].forEach((nth, day) => {
    setSystemTime(new Date(2025, 9, day + 1))
    garden.append('message', message('user', `The ${nth} gazebo note`))
  })
  setSystemTime()
  sand.sessions.rename(garden.id, 'Garden')
  thread(sand, 'Walk', [message('assistant', `${filler.repeat(3)}Then the gazebo paint came up: teal, like the old gazebo door. ${filler}`)])

  const both = await search('gazebo')
  expect(titles(both)).toEqual(['Walk', 'Garden'])
  expect(both.chats[1]).toMatchObject({ matches: 5, hits: [{ excerpt: { text: 'The fifth gazebo note' } }, { excerpt: { text: 'The fourth gazebo note' } }] })
  const [inGarden] = (await search('gazebo', { chat: garden.id })).chats
  expect(lines(inGarden!)).toEqual(['fifth', 'fourth', 'third', 'second', 'first'].map(nth => `The ${nth} gazebo note`))
  const [older] = (await search('gazebo', { chat: garden.id, before: inGarden!.hits[1]!.at, limit: 2 })).chats
  expect(lines(older!)).toEqual(['The third gazebo note', 'The second gazebo note'])

  const [walk] = (await search('gazebo paint')).chats[0]!.hits
  expect(walk!.excerpt.text).toStartWith('…')
  expect(walk!.excerpt.text).toEndWith('…')
  expect(walk!.excerpt.text).toContain('Then the gazebo paint came up: teal')
  expect(walk!.excerpt.text.length).toBeLessThanOrEqual(124)
  expect(marked(walk!.excerpt)).toEqual(['gazebo', 'paint', 'gazebo'])
})

test('messages written while message search was off are found once it starts, and agents search them with message_search', async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-message-search-'))
  const before = await start({ plugins: [], shared: home })
  const painted = thread(before, 'Paint', [message('user', 'The gazebo paint is teal.')])
  await before.stop()
  running = []

  const call: Reply = [{ type: 'call', name: 'message_search', input: { query: 'gazebo paint' } }]
  const after = await start({ shared: home, replies: [call, [{ type: 'text', text: 'Teal.' }]] })
  const asking = after.chat('fake/m')
  await after.turns.run(asking, 'What colour did we pick for the gazebo?')

  const result = asking
    .messages()
    .flatMap(said => said.content)
    .find(block => block.type === 'tool_result')
  expect(result?.type === 'tool_result' && result.content).toEqual([{ type: 'text', text: expect.stringContaining(`"link":"thread:${painted.id}"`) }])
  expect(JSON.stringify(result)).toContain('The gazebo paint is teal.')
})
