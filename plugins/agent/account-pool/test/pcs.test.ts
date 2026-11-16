import { llm } from '@sand/accounts/contract'
import { pairPcs, startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

const sands: Sand[] = []

afterEach(async () => {
  await Promise.all(sands.splice(0).map(sand => sand.stop()))
})

const hour = 3_600_000

const week = (resetInMs: number) => [{ id: 'week', label: 'Week', used: 0.5, resetInMs, durationMs: 7 * 24 * hour }]

const said = (text: string) => ({ type: 'text', text }) as const

const started = async (...made: Promise<Sand>[]) => {
  const all = await Promise.all(made)
  sands.push(...all)
  return all
}

const until = async (ready: () => boolean) => {
  for (const end = Date.now() + 10_000; Date.now() < end; await Bun.sleep(10)) if (ready()) return
  throw new Error('It never happened')
}

const account = (sand: Sand, id: string) => sand.app.get(llm)?.accounts?.().find(found => found.id === id)

test("a chat runs on the plan account its paired PC holds, with the chat's tools run where the chat is, and moves to this PC's account once that PC goes offline", async () => {
  const [home, box] = await started(
    startSand([{ id: 'plan', label: 'Plan', models: ['m'], limits: week(100 * hour), replies: [[said('Here.')]] }], { plugins: ['agent/account-pool'] }),
    startSand([{ id: 'plan', label: 'Plan', models: ['m'], limits: week(20 * hour), replies: [[{ type: 'call', name: 'where', input: {} }], [said('Done.')]] }]),
  )
  const ran: string[] = []
  home!.tool('where', () => {
    ran.push('home')
    return 'on home'
  })
  await Promise.all([home!.llm.refreshLimits?.(), box!.llm.refreshLimits?.()])
  const links = pairPcs(home!, box!)
  await until(() => !!account(home!, 'plan@box')?.online)
  expect(home!.llm.models?.().map(model => model.id)).toEqual(['plan/m'])

  const chat = home!.chat('plan/m')
  expect((await home!.turns.run(chat, 'Go')).text).toBe('Done.')
  expect(ran).toEqual(['home'])
  expect(box!.native('plan')).toContainEqual(expect.objectContaining({ type: 'answer', text: 'on home' }))
  expect(home!.native('plan')).toEqual([])

  links.toBox.drop()
  expect((await home!.turns.run(chat, 'Again')).text).toBe('Here.')
  expect(home!.turns.list(chat, undefined, 1)[0]?.selection.source).toBe('plan')
})
