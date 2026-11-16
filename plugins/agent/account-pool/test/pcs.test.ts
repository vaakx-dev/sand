import { llm } from '@sand/accounts/contract'
import type { Reply } from '@sand/replay/contract'
import { pairPcs, startSand, type Sand } from '@sand/harness'
import { schedules } from '@sand/schedules/contract'
import { afterEach, expect, test } from 'bun:test'

const sands: Sand[] = []

afterEach(async () => {
  await Promise.all(sands.splice(0).map(sand => sand.stop()))
})

const hour = 3_600_000

const week = (resetInMs: number) => [{ id: 'week', label: 'Week', used: 0.5, resetInMs, durationMs: 7 * 24 * hour }]

const said = (text: string) => ({ type: 'text', text }) as const

const until = async (ready: () => boolean) => {
  for (const end = Date.now() + 10_000; Date.now() < end; await Bun.sleep(10)) if (ready()) return
  throw new Error('It never happened')
}

const account = (sand: Sand, id: string) => sand.app.get(llm)?.accounts?.().find(found => found.id === id)

const paired = async (held: Reply[]) => {
  const made = await Promise.all([
    startSand([{ id: 'plan', label: 'Plan', models: ['m'], limits: week(100 * hour), replies: [[said('Here.')]] }], { plugins: ['agent/account-pool', 'automation/schedules', 'agent/usage-resume'] }),
    startSand([{ id: 'plan', label: 'Plan', models: ['m'], limits: week(20 * hour), replies: held }]),
  ])
  sands.push(...made)
  const [home, box] = made as [Sand, Sand]
  await Promise.all([home.llm.refreshLimits?.(), box.llm.refreshLimits?.()])
  const links = pairPcs(home, box)
  await until(() => !!account(home, 'plan@box')?.online)
  return { home, box, links, chat: home.chat('plan/m') }
}

test("a chat runs on the plan account its paired PC holds, with the chat's tools run where the chat is, and moves to this PC's account once that PC goes offline", async () => {
  const { home, box, links, chat } = await paired([[{ type: 'call', name: 'where', input: {} }], [said('Done.')]])
  const ran: string[] = []
  home.tool('where', () => {
    ran.push('home')
    return 'on home'
  })
  expect(home.llm.models?.().map(model => model.id)).toEqual(['plan/m'])

  expect((await home.turns.run(chat, 'Go')).text).toBe('Done.')
  expect(ran).toEqual(['home'])
  expect(box.native('plan')).toContainEqual(expect.objectContaining({ type: 'answer', text: 'on home' }))
  expect(home.native('plan')).toEqual([])

  links.toBox.drop()
  expect((await home.turns.run(chat, 'Again')).text).toBe('Here.')
  expect(home.turns.list(chat, undefined, 1)[0]?.selection.source).toBe('plan')
  expect(chat.entries().filter(entry => entry.type === 'handoff')).toEqual([])
})

test('a reply cut off by its PC dropping carries on on this PC’s account of the same plan', async () => {
  const { home, box, links, chat } = await paired([[{ type: 'hold' }]])

  const first = home.turns.run(chat, 'Go')
  await until(() => box.native('plan').some(call => call.type === 'send'))
  links.toBox.drop()

  await first.catch(() => undefined)
  await until(() => home.turns.list(chat).length === 2 && !home.turns.current(chat))
  const [carried, cut] = home.turns.list(chat)
  expect(cut).toMatchObject({ stopReason: 'moved', selection: { source: 'plan@box' } })
  expect(carried).toMatchObject({ stopReason: 'end_turn', selection: { source: 'plan' } })
  expect(home.native('plan')).toContainEqual(expect.objectContaining({ type: 'send' }))
})

test("a paired PC's sign-in to a plan joins the pool beside this PC's own sign-in to it", async () => {
  const made = await Promise.all([
    startSand([{ id: 'plan', label: 'Plan', api: 'anthropic', models: ['m'], replies: [] }], { plugins: ['agent/account-pool'] }),
    startSand([{ id: 'plan', label: 'Plan', api: 'anthropic', models: ['m'], replies: [] }]),
  ])
  sands.push(...made)
  const [home, box] = made as [Sand, Sand]
  pairPcs(home, box)
  await until(() => !!account(home, 'plan@box')?.online)
  expect(home.llm.members?.('plan/m').map(member => member.source)).toEqual(expect.arrayContaining(['plan', 'plan@box']))
})

test("a chat stops moving once every account on the paired PC has run out, though that PC's limits looked fine before", async () => {
  const spent = [{ id: 'week', label: 'Week', used: 1, resetInMs: 100 * hour, durationMs: 7 * 24 * hour }]
  const limited: Reply[] = [[{ type: 'limit', resetInMs: hour }]]
  const made = await Promise.all([
    startSand([{ id: 'plan', label: 'Plan', models: ['m'], limits: spent }], { plugins: ['agent/account-pool', 'automation/schedules', 'agent/usage-resume'] }),
    startSand([
      { id: 'plan', label: 'Plan', models: ['m'], limits: week(20 * hour), replies: limited },
      { id: 'plan-2', of: 'plan', label: 'Plan 2', models: ['m'], limits: week(30 * hour), replies: limited },
    ]),
  ])
  sands.push(...made)
  const [home, box] = made as [Sand, Sand]
  await Promise.all([home.llm.refreshLimits?.(), box.llm.refreshLimits?.()])
  pairPcs(home, box)
  await until(() => !!account(home, 'plan@box')?.online && !!account(home, 'plan-2@box')?.online)
  const chat = home.chat('plan/m')

  await home.turns.run(chat, 'Go').catch(() => undefined)
  await until(() => home.turns.list(chat).length >= 2 && !home.turns.current(chat))
  await until(() => (home.app.get(schedules)?.list('usage-resume') ?? []).length > 0)
  const turns = home.turns.list(chat)
  expect(turns.map(turn => turn.stopReason)).toEqual(['limited', 'limited'])
  expect(turns.map(turn => turn.selection.source).sort()).toEqual(['plan-2@box', 'plan@box'])
})
