import { botMemory, memoryRead, memoryWrite } from '@sand/bot-memory/contract'
import { botCreate, botDelete, botList } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let sand: Sand

const memory = () => sand.app.get(botMemory)!

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const overflow = { type: 'error', message: 'prompt is too long' } as const

const start = (replies: Source['replies']) =>
  startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }], { plugins: ['bots/bots', 'bots/memory', 'bots/turns'] })

const talk = async (bot: string, prompt: string) => {
  const before = sand.requests('fake').length
  await sand.ask(botSend, { bot, prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 300; tries++) {
    const found = (await sand.ask(botList, {})).find(listed => listed.id === bot)
    if (sand.requests('fake').length > before && found?.status === 'idle' && found.last?.role === 'assistant') return
    await Bun.sleep(10)
  }
  throw new Error(`${prompt} never got an answer`)
}

const bodies = () => sand.requests('fake').map(body => JSON.parse(body))

const firstText = (body: { messages: { content: { text: string }[] }[] }) => body.messages[0]!.content[0]!.text

const summary = '## Working on\n- Booking lunch with Ana on Friday'

const remembered = '## The user\n- Lives in Lisbon.\n\n## Preferences and rules\n- No meetings before 10.'

const compacted = (memory: string, notes = '') => said(`<summary>\n${summary}\n</summary>\n<memory>\n${memory}\n</memory>\n<notes>\n${notes}\n</notes>`)

test("a bot's memory is one Markdown file in its folder that the user can read and write", async () => {
  sand = await start([])
  const bot = await sand.ask(botCreate, { name: 'Calendar' })
  expect(await sand.ask(memoryRead, { bot: bot.id })).toBe('')

  await sand.ask(memoryWrite, { bot: bot.id, text: '## People\n- Ana likes early meetings.\n' })
  const path = join(sand.home, 'bots', bot.id, 'memory.md')
  expect(await Bun.file(path).text()).toBe('## People\n- Ana likes early meetings.\n')
  expect(await sand.ask(memoryRead, { bot: bot.id })).toBe('## People\n- Ana likes early meetings.\n')
  await expect(sand.ask(memoryRead, { bot: 'nobody' })).rejects.toThrow('No bot nobody')

  await sand.ask(botDelete, { bot: bot.id })
  expect(existsSync(path)).toBe(false)
})

test('when a bot compacts, it rewrites its memory from all it drops and summarizes the work in hand, and its next request carries both', async () => {
  sand = await start([[said('Noted.')], [overflow], [said(`<summary>\n${summary}\n</summary>\n\n<memory>\n${remembered}\n</memory>`)], [said('Booked.')]])
  const bot = await sand.ask(botCreate, { name: 'Calendar', models: { main: { model: 'fake/m' }, quick: {} } })
  await sand.ask(memoryWrite, { bot: bot.id, text: '## The user\n- Lives in Lisbon.' })

  await talk(bot.id, 'Remember: no meetings before 10.')
  await talk(bot.id, 'Book lunch with Ana on Friday')

  const [, , compaction, next] = bodies()
  expect(firstText(compaction)).toContain('[User]: Remember: no meetings before 10.')
  expect(firstText(compaction)).toContain('<current-memory>\n## The user\n- Lives in Lisbon.\n</current-memory>')
  expect(await sand.ask(memoryRead, { bot: bot.id })).toBe(`${remembered}\n`)
  expect(next.system[0].text).toContain(`<memory>\n${remembered}\n</memory>`)
  expect(firstText(next)).toContain(summary)
  expect(firstText(next)).not.toContain('<memory>')
})

test('near its context limit, a bot rewrites its memory and summarizes on the side, and its next turn starts from both', async () => {
  const notes = 'Ana and I keep our notes here. '.repeat(3000)
  const full = { type: 'usage', input: 160_000, output: 10 } as const
  sand = await start([[said('Noted.')], [said('Noted.'), full], [said(`<summary>\n${summary}\n</summary>\n\n<memory>\n${remembered}\n</memory>`)], [said('Booked.')]])
  const bot = await sand.ask(botCreate, { name: 'Calendar', models: { main: { model: 'fake/m' }, quick: {} } })

  await talk(bot.id, `Remember: no meetings before 10.\n${notes}`)
  await talk(bot.id, `More notes.\n${notes}`)
  for (let tries = 0; tries < 300 && (await sand.ask(memoryRead, { bot: bot.id })) !== `${remembered}\n`; tries++) await Bun.sleep(10)
  await talk(bot.id, 'Book lunch with Ana on Friday')

  const [, last, compaction, next] = bodies()
  expect(compaction.system).toEqual(last.system)
  expect(compaction.messages[0].content[0].text).toBe(last.messages[0].content[0].text)
  expect(next.system[0].text).toContain(`<memory>\n${remembered}\n</memory>`)
  expect(firstText(next)).toContain(summary)
})

test('a memory over the size limit is sent back once to be cut to fit', async () => {
  const long = `## Decisions\n${'- Something minor.\n'.repeat(300)}`
  sand = await start([[said('Noted.')], [overflow], [compacted(long)], [compacted(remembered)], [said('Booked.')]])
  const bot = await sand.ask(botCreate, { name: 'Calendar', models: { main: { model: 'fake/m' }, quick: {} } })

  await talk(bot.id, 'Remember: no meetings before 10.')
  await talk(bot.id, 'Book lunch with Ana on Friday')

  const retry = bodies()[3]
  expect(retry.messages.at(-1).content[0].text).toContain('over the 4000 limit')
  expect(await sand.ask(memoryRead, { bot: bot.id })).toBe(`${remembered}\n`)
})

test("a bot's notes are Markdown files in its notes folder, removed when emptied", async () => {
  sand = await start([])
  const bot = await sand.ask(botCreate, { name: 'Ops' })
  expect(await memory().notes(bot.id)).toEqual([])

  await memory().writeNote(bot.id, { name: 'deploys', text: 'How deploys go.\n- Staging first.\n' })
  const path = join(sand.home, 'bots', bot.id, 'notes', 'deploys.md')
  expect(await Bun.file(path).text()).toBe('How deploys go.\n- Staging first.\n')
  expect(await memory().notes(bot.id)).toEqual([{ name: 'deploys', text: 'How deploys go.\n- Staging first.\n' }])
  await expect(memory().writeNote(bot.id, { name: '../memory', text: 'x' })).rejects.toThrow()

  await memory().writeNote(bot.id, { name: 'deploys', text: '' })
  expect(existsSync(path)).toBe(false)
})

test('when a bot compacts, it writes what it learned about its work as notes, lists them in its instructions and looks them up', async () => {
  const note = '<note name="deploys">\nHow deploys go and what broke them.\n\n## Rollback\n- A failed migration needs a manual rollback (2026-11-02).\n</note>'
  const lookup = { type: 'call', name: 'note_read', input: { query: 'rollback migration' } } as const
  sand = await start([[said('Noted.')], [overflow], [compacted(remembered, note)], [lookup], [said('Rolled back.')]])
  const bot = await sand.ask(botCreate, { name: 'Ops', models: { main: { model: 'fake/m' }, quick: {} } })

  await talk(bot.id, 'The deploy failed on the migration.')
  await talk(bot.id, 'Roll it back')

  const [, , compaction, next, after] = bodies()
  expect(firstText(compaction)).toContain('You have no notes so far.')
  expect(await memory().notes(bot.id)).toEqual([
    { name: 'deploys', text: 'How deploys go and what broke them.\n\n## Rollback\n- A failed migration needs a manual rollback (2026-11-02).\n' },
  ])
  expect(next.system[0].text).toContain('- deploys: How deploys go and what broke them.')
  expect(next.system[0].text).not.toContain('manual rollback')
  expect(JSON.stringify(after.messages.at(-1))).toContain('## Rollback\\n- A failed migration needs a manual rollback')
})

test('a note the bot changes without having seen it is shown to it, and it writes it whole', async () => {
  const merged = 'How deploys go.\n- Staging first.\n- Production needs a release tag.'
  const first = compacted(remembered, '<note name="deploys">\n- Production needs a release tag.\n</note>')
  const second = compacted(remembered, `<note name="deploys">\n${merged}\n</note>`)
  sand = await start([[said('Noted.')], [overflow], [first], [second], [said('Tagged.')]])
  const bot = await sand.ask(botCreate, { name: 'Ops', models: { main: { model: 'fake/m' }, quick: {} } })
  await memory().writeNote(bot.id, { name: 'deploys', text: 'How deploys go.\n- Staging first.\n' })

  await talk(bot.id, 'Production needs a release tag now.')
  await talk(bot.id, 'Ship it')

  const [, , compaction, retry] = bodies()
  expect(firstText(compaction)).toContain('- deploys (32 characters): How deploys go.')
  expect(firstText(compaction)).not.toContain('Staging first')
  expect(retry.messages.at(-1).content[0].text).toContain('<current-note name="deploys">\nHow deploys go.\n- Staging first.\n</current-note>')
  expect(await memory().notes(bot.id)).toEqual([{ name: 'deploys', text: `${merged}\n` }])
})
