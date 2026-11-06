import { botConversation, botCreate, botGet, botJobs, botUpdate, jobEntry } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const setJob = (input: Record<string, unknown>): Reply => [{ type: 'call', name: 'set_job', input }]

const answered = async (bot: string, prompt: string) => {
  const before = (await sand.ask(botGet, { bot }))?.last?.at ?? 0
  await sand.ask(botSend, { bot, prompt, clientRequestId: prompt })
  for (let tries = 0; tries < 300; tries++) {
    const last = (await sand.ask(botGet, { bot }))?.last
    if (last?.role === 'assistant' && last.at > before) return
    await Bun.sleep(10)
  }
  throw new Error(`${prompt} got no reply`)
}

test('a bot with no job writes its own job, works to it from its next step, and keeps the jobs it replaced', async () => {
  const job = "You keep the user's notes."
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [setJob({ job, name: 'Notes' }), [said('Done.')], setJob({ job: 'You file notes.', name: 'Filer' }), [said('Done.')]] }], {
    plugins: ['agent/mcp-server', 'bots/bots', 'bots/memory', 'bots/turns'],
  })
  const bot = await sand.ask(botCreate, { models: { main: { model: 'fake/m' }, quick: {} } })

  await answered(bot.id, 'Keep my notes')
  const [, next] = sand.requests('fake').map(body => JSON.parse(body).system[0].text as string)
  expect(next).toStartWith('You are Notes')
  expect(next).toContain(job)
  const { entries } = await sand.ask(botConversation, { bot: bot.id })
  expect(entries.filter(entry => entry.type === jobEntry).map(entry => entry.data)).toEqual([{ job, previous: '' }])

  await answered(bot.id, 'File them instead')
  expect(await sand.ask(botGet, { bot: bot.id })).toMatchObject({ name: 'Notes', job: 'You file notes.' })
  await sand.ask(botUpdate, { bot: bot.id, patch: { job } })
  expect((await sand.ask(botJobs, { bot: bot.id })).map(version => version.job)).toEqual(['You file notes.', job])
})
