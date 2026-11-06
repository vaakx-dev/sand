import { botCreate, botGet } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { z } from 'zod'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const systemOf = async (plugins: string[]) => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said('ok')]] }], { plugins: ['bots/bots', 'bots/memory', 'bots/turns', ...plugins] })
  sand.app.get(tools)!.register({ name: 'shell_run', description: 'Run a command on the PC. It waits for it to finish.', needs: ['pc'], input: z.object({}), run: () => '' })
  sand.app.get(tools)!.register({ name: 'thread_only', description: 'Only for threads.', needs: ['thread'], input: z.object({}), run: () => '' })
  const bot = await sand.ask(botCreate, { name: 'Helper', models: { main: { model: 'fake/m' }, quick: {} } })
  await sand.ask(botSend, { bot: bot.id, prompt: 'Remind me on Wednesday evening', clientRequestId: 'one' })
  for (let tries = 0; tries < 200 && (await sand.ask(botGet, { bot: bot.id }))?.last?.role !== 'assistant'; tries++) await Bun.sleep(10)
  const [request] = sand.requests('fake').map(body => JSON.parse(body))
  return { system: request.system[0].text as string, tools: (request.tools as { name: string }[]).map(tool => tool.name) }
}

const never = 'Never say you will do something, or that you did something, that none of your tools can do'

test('a bot is told it can act only through the tools it has, and never to promise more', async () => {
  const { system, tools: given } = await systemOf([])

  expect(system).toContain('## What you can do')
  expect(system).toContain('- memory_write: Save a file in your memory, replacing what it held.')
  expect(system).toContain(never)
  expect(system).not.toContain('routine_create')
  expect(system).not.toContain('thread_only')
  expect(given).not.toContain('thread_only')
})

test('what a bot is told it can do follows the tools its plugins give it', async () => {
  const { system, tools: given } = await systemOf(['automation/schedules', 'bots/routines'])

  expect(system).toContain('- shell_run: Run a command on the PC.\n')
  expect(system).toContain('- routine_create: Set yourself a reminder or a routine: when it comes due, you get a turn in this conversation')
  expect(system).toContain(never)
  for (const name of ['memory_write', 'routine_create', 'routine_list', 'shell_run']) {
    expect(given).toContain(name)
    expect(system).toContain(`- ${name}: `)
  }
})
