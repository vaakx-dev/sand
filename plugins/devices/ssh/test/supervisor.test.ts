import { expect, test } from 'bun:test'
import { createAnswers } from '../src/host/askpass/answers'
import { createSupervisor, type OpenLink } from '../src/host/machines/supervisor'
import { NeedsYou } from '../src/host/ssh/failure'

type Opening = { kind: 'fail'; error: Error } | { kind: 'link' }

const fakeLink = () => {
  const closed = Promise.withResolvers<string>()
  const link: OpenLink = { lport: 41000, rport: 42000, closed: closed.promise, close: () => closed.resolve('closed by sand') }
  return { link, drop: (error: string) => closed.resolve(error) }
}

const setup = (openings: Opening[]) => {
  let clock = 0
  const sleeps: number[] = []
  const published: number[] = []
  const links: ReturnType<typeof fakeLink>[] = []
  const wake: (() => void)[] = []
  let opens = 0
  const supervisor = createSupervisor({
    open: async () => {
      opens++
      const next = openings.shift()
      if (!next) return new Promise<OpenLink>(() => {})
      if (next.kind === 'fail') throw next.error
      const made = fakeLink()
      links.push(made)
      return made.link
    },
    background: () => createAnswers({}),
    publish: link => {
      published.push(link.lport)
      return () => void published.push(-link.lport)
    },
    changed: () => {},
    sleep: ms => {
      sleeps.push(ms)
      clock += ms
      return new Promise<void>(resolve => wake.push(resolve))
    },
    random: () => 0.5,
    now: () => clock,
  })
  const settle = () => Bun.sleep(1)
  const tick = async () => {
    wake.shift()?.()
    await settle()
  }
  return { supervisor, sleeps, published, links, tick, settle, opens: () => opens, advance: (ms: number) => (clock += ms) }
}

test('retries failures with growing delays and connects once ssh gets through', async () => {
  const fail = { kind: 'fail', error: new Error('ssh: connect to host box port 22: Connection refused') } as const
  const run = setup([fail, fail, fail, { kind: 'link' }])
  await expect(run.supervisor.connect()).rejects.toThrow('Connection refused')
  expect(run.supervisor.status()).toEqual({ state: 'failed', error: 'ssh: connect to host box port 22: Connection refused' })
  await run.tick()
  await run.tick()
  await run.tick()
  expect(run.sleeps).toEqual([1000, 2000, 4000])
  expect(run.supervisor.status()).toEqual({ state: 'connected' })
  expect(run.published).toEqual([41000])
})

test('a dropped link is withdrawn and retried, and a stable link resets the delay', async () => {
  const run = setup([{ kind: 'fail', error: new Error('down') }, { kind: 'link' }, { kind: 'link' }])
  void run.supervisor.connect().catch(() => {})
  await run.settle()
  await run.tick()
  run.advance(120_000)
  run.links[0]?.drop('Timeout, server box not responding.')
  await run.settle()
  expect(run.published).toEqual([41000, -41000])
  expect(run.supervisor.status()).toEqual({ state: 'failed', error: 'Timeout, server box not responding.' })
  expect(run.sleeps).toEqual([1000, 1000])
  await run.tick()
  expect(run.supervisor.status()).toEqual({ state: 'connected' })
})

test('stops retrying when ssh needs the user, until a reconnect', async () => {
  const run = setup([{ kind: 'fail', error: new NeedsYou('SSH asks “Verification code:”') }, { kind: 'link' }])
  await expect(run.supervisor.connect()).rejects.toBeInstanceOf(NeedsYou)
  await run.settle()
  expect(run.supervisor.status().state).toBe('needs-you')
  expect(run.sleeps).toEqual([])
  expect(run.opens()).toBe(1)
  await run.supervisor.connect(createAnswers({}))
  expect(run.supervisor.status()).toEqual({ state: 'connected' })
})

test('cancelling the attempt stops the run and leaves the machine waiting for the user', async () => {
  const run = setup([])
  const controller = new AbortController()
  const connecting = run.supervisor.connect(createAnswers({}), controller.signal)
  await run.settle()
  expect(run.supervisor.status().state).toBe('connecting')
  controller.abort()
  await expect(connecting).rejects.toThrow('Cancelled')
  expect(run.supervisor.status()).toEqual({ state: 'needs-you', error: 'Cancelled' })
})

test('stopping closes an open link and withdraws its routes', async () => {
  const run = setup([{ kind: 'link' }])
  await run.supervisor.connect()
  run.supervisor.stop()
  await run.settle()
  expect(run.published).toEqual([41000, -41000])
  expect(run.sleeps).toEqual([])
})
