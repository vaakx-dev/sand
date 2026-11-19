import type { Session } from '@sand/chats/contract'
import { pairPcs, startSand, type Sand } from '@sand/harness'
import type { ThreadUsage } from '@sand/usage/contract'
import { afterEach, expect, test } from 'bun:test'
import { usageThread, usageThreadChange } from '../src/contract'

let sand: Sand
let box: Sand | undefined

afterEach(async () => {
  await Promise.all([sand.stop(), box?.stop()])
  box = undefined
})

const price = { input: 1, output: 10, cacheRead: 0, cacheWrite: 0 }

const reply = (input: number, output: number) => [{ type: 'text', text: 'Done.' }, { type: 'usage', input, output }] as const

const finished = async (chat: Session, count: number) => {
  for (const end = Date.now() + 10_000; Date.now() < end; await Bun.sleep(20)) if (sand.turns.list(chat).length === count && !sand.turns.current(chat)) return
  throw new Error('The turns never finished')
}

test("a thread's usage adds up its own turns and its subagents' turns, per model", async () => {
  sand = await startSand(
    [{ id: 'fake', models: ['big', 'small'], price, replies: [[...reply(1_000, 100)], [...reply(2_000, 200)]] }],
    { plugins: ['ui/inspector/usage'] },
  )
  const thread = sand.chat('fake/big')
  await sand.turns.send(thread, { prompt: 'One', clientRequestId: 'one' })
  await finished(thread, 1)
  await sand.turns.send(thread, { prompt: 'Two', clientRequestId: 'two' })
  await finished(thread, 2)
  const helper = sand.sessions.agent({ parent: thread.id, cwd: thread.cwd, title: 'Helper' })
  helper.append('usage', { id: 'u-helper', model: 'fake/small', source: 'fake', usage: { input: 500, output: 50, cacheRead: 0, cacheWrite: 0 } })

  const usage = await sand.ask(usageThread, { session: thread.id })

  expect(usage.total).toMatchObject({ turns: 3, usage: { input: 3_500, output: 350 } })
  expect(usage.models.map(model => [model.name, model.turns, model.subagents])).toEqual([
    ['big', 2, 0],
    ['small', 1, 1],
  ])
  expect(usage.total.cost).toBeCloseTo((3_500 * 1 + 350 * 10) / 1_000_000)
})

test("a thread's usage counts its subagents on other PCs, and pages hear when they spend", async () => {
  const plugins = ['ui/inspector/usage', 'agent/subagents', 'core/watch']
  box = await startSand([{ id: 'fake', models: ['small'], price, api: 'anthropic', replies: [[...reply(500, 50)]] }], { plugins })
  const delegate = { type: 'call', name: 'agent', input: { label: 'Dig', task: 'Dig into it', model: 'fake/small', pc: 'box', folder: box.home } } as const
  const parentReplies = [[delegate, { type: 'usage', input: 1_000, output: 100 } as const], [...reply(2_000, 200)], [...reply(0, 0)], [...reply(0, 0)]]
  sand = await startSand([{ id: 'fake', models: ['big', 'small'], price, api: 'anthropic', replies: parentReplies }], { plugins })
  pairPcs(sand, box)
  const thread = sand.chat('fake/big')
  const withSubagent = (usage: ThreadUsage) => usage.session === thread.id && usage.models.some(model => model.name === 'small')
  const heard = new Promise<ThreadUsage>(resolve => {
    const stop = sand.hear(usageThreadChange, usage => {
      if (!withSubagent(usage)) return
      stop()
      resolve(usage)
    })
  })

  await sand.turns.run(thread, 'Go')

  const small = (usage: ThreadUsage) => usage.models.find(model => model.name === 'small')
  expect(small(await heard)).toMatchObject({ turns: 1, subagents: 1, usage: { input: 500, output: 50 } })
  const usage = await sand.ask(usageThread, { session: thread.id })
  expect(small(usage)?.cost).toBeCloseTo((500 * 1 + 50 * 10) / 1_000_000)
})
