import { botCreate, botGet } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { z } from 'zod'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const firstRequest = async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said('ok')]] }], { plugins: ['bots/bots', 'bots/memory', 'bots/turns'] })
  sand.app.get(tools)!.register({ name: 'shell_run', description: 'Run a command on the PC.', needs: ['pc'], input: z.object({}), run: () => '' })
  sand.app.get(tools)!.register({ name: 'thread_only', description: 'Only for threads.', needs: ['thread'], input: z.object({}), run: () => '' })
  const bot = await sand.ask(botCreate, { name: 'Helper', models: { main: { model: 'fake/m' }, quick: {} } })
  await sand.ask(botSend, { bot: bot.id, prompt: 'Hi', clientRequestId: 'one' })
  for (let tries = 0; tries < 200 && (await sand.ask(botGet, { bot: bot.id }))?.last?.role !== 'assistant'; tries++) await Bun.sleep(10)
  const [request] = sand.requests('fake').map(body => JSON.parse(body))
  return { system: request.system[0].text as string, tools: (request.tools as { name: string }[]).map(tool => tool.name) }
}

test('a bot gets its tools like a thread does, not as a list in its prompt', async () => {
  const { system, tools: given } = await firstRequest()

  expect(given).toContain('shell_run')
  expect(given).not.toContain('thread_only')
  expect(system).not.toContain('shell_run')
  expect(system).not.toContain('## Your job')
  expect(system).toContain('## Your memory\n\nYour memory is empty so far.')
  expect(system).toContain('# Environment')
  expect(system).not.toContain('Date:')
})
