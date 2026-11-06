import { botCreate, botGet } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { startSand, type Sand } from '@sand/harness'
import { skills } from '@sand/skills/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const start = async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said('ok')], [said('ok')]] }], {
    plugins: ['core/watch', 'agent/skills', 'bots/bots', 'bots/memory', 'bots/turns'],
  })
  const dir = join(sand.home, 'contributed', 'verify')
  await Bun.write(join(dir, 'SKILL.md'), '---\nname: verify\ndescription: Check that a change works\n---\nRun it.')
  sand.app.get(skills)!.register(dir)
  while (!(await sand.app.get(skills)!.list()).length) await Bun.sleep(10)
}

const skillTool = (body: string) => (JSON.parse(body).tools as { name: string; description: string }[]).find(tool => tool.name === 'skill')

test('threads and bots both list the skills a plugin registers after start', async () => {
  await start()

  await sand.turns.run(sand.chat('fake/m'), 'Hi')
  const bot = await sand.ask(botCreate, { name: 'Helper', models: { main: { model: 'fake/m' }, quick: {} } })
  await sand.ask(botSend, { bot: bot.id, prompt: 'Hi', clientRequestId: 'one' })
  while ((await sand.ask(botGet, { bot: bot.id }))?.last?.role !== 'assistant') await Bun.sleep(10)

  const [thread, fromBot] = sand.requests('fake').map(skillTool)
  expect(thread?.description).toContain('- verify: Check that a change works')
  expect(fromBot?.description).toEqual(thread!.description)
})
