import { memoryRead, memoryWrite } from '@sand/bot-memory/contract'
import { botCreate, botDelete, botGet } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const overflow = { type: 'error', message: 'prompt is too long' } as const

const start = (replies: Source['replies']) =>
  startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }], { plugins: ['bots/bots', 'bots/memory', 'bots/turns'] })

const talk = async (bot: string, prompt: string) => {
  const before = sand.requests('fake').length
  await sand.ask(botSend, { bot, prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 300; tries++) {
    const found = await sand.ask(botGet, { bot })
    if (sand.requests('fake').length > before && found?.status === 'idle' && found.last?.role === 'assistant') return
    await Bun.sleep(10)
  }
  throw new Error(`${prompt} never got an answer`)
}

const bodies = () => sand.requests('fake').map(body => JSON.parse(body))

const firstText = (body: { messages: { content: { text: string }[] }[] }) => body.messages[0]!.content[0]!.text

const summary = '## Working on\n- Booking lunch with Ana on Friday'

const remembered = '## The user\n- Lives in Lisbon.\n\n## Preferences and rules\n- No meetings before 10.'

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

test('a memory over the size limit is sent back once to be cut to fit', async () => {
  const long = `## Decisions\n${'- Something minor.\n'.repeat(300)}`
  const reply = (memory: string) => said(`<summary>\n${summary}\n</summary>\n<memory>\n${memory}\n</memory>`)
  sand = await start([[said('Noted.')], [overflow], [reply(long)], [reply(remembered)], [said('Booked.')]])
  const bot = await sand.ask(botCreate, { name: 'Calendar', models: { main: { model: 'fake/m' }, quick: {} } })

  await talk(bot.id, 'Remember: no meetings before 10.')
  await talk(bot.id, 'Book lunch with Ana on Friday')

  const retry = bodies()[3]
  expect(retry.messages.at(-1).content[0].text).toContain('over the 4000 limit')
  expect(await sand.ask(memoryRead, { bot: bot.id })).toBe(`${remembered}\n`)
})
