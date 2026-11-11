import { expect, test } from 'bun:test'
import { limits, terminalExit, terminalGrid, terminalInput, terminalOpen } from '../src/contract'
import { createScreen, page, setup } from './fixture'

const size = { cols: 80, rows: 24 }

const opened = async (fixture: ReturnType<typeof setup>, caller = page(), viewer = 'v1') =>
  (await fixture.terminals.open({ session: 's1', cwd: '/work', viewer, ...size }, caller)).id

test('only people on their devices may open or type into terminals, and only in an existing full folder', async () => {
  const { handlers, shells } = setup()
  const open = { session: 's1', cwd: '/work', viewer: 'v1', ...size }

  for (const kind of ['agent', 'pc', 'runtime'] as const) {
    await expect(handlers.ask(terminalOpen, open, page(kind))).rejects.toThrow(`A ${kind} can't ask for terminal.open`)
  }
  await expect(handlers.ask(terminalOpen, { ...open, cwd: 'work' }, page())).rejects.toThrow("isn't a full folder path")
  await expect(handlers.ask(terminalOpen, { ...open, cwd: '/missing' }, page())).rejects.toThrow('no folder at /missing')
  await expect(handlers.ask(terminalOpen, { ...open, cols: 0 }, page())).rejects.toThrow()
  expect(shells).toEqual([])

  const phone = page('phone')
  const { id } = await handlers.ask(terminalOpen, open, phone)
  await expect(handlers.ask(terminalInput, { id, viewer: 'v1', seq: 1, data: 'ls\r' }, page('agent'))).rejects.toThrow("can't ask for terminal.input")
  await expect(handlers.ask(terminalInput, { id, viewer: 'v1', seq: 1, data: 'ls\r' }, page())).rejects.toThrow('Attach to the terminal first')
  await handlers.ask(terminalInput, { id, viewer: 'v1', seq: 1, data: 'ls\r' }, phone)
  await expect(handlers.ask(terminalInput, { id, viewer: 'v1', seq: 2, data: 'x'.repeat(limits.input + 1) }, phone)).rejects.toThrow()
  expect(shells[0]!.typed).toEqual(['ls\r'])
})

test('steady output reaches a slow page in batched frames that never outrun the window, and arrives whole', async () => {
  const fixture = setup()
  const caller = page()
  const id = await opened(fixture, caller)
  const screen = createScreen()
  fixture.tick()
  screen.apply(fixture.framesFor(caller))

  const line = `${'y'.repeat(79)}
`
  let all = ''
  let unacked = 0
  let most = 0
  for (let round = 0; round < 6; round++) {
    for (let index = 0; index < 100; index++) {
      const chunk = line.repeat(8 + (index % 3))
      all += chunk
      fixture.shells[0]!.events.output(chunk)
    }
    fixture.tick()
    const frames = fixture.framesFor(caller)
    unacked += frames.reduce((sum, frame) => sum + frame.data.length, 0)
    most = Math.max(most, unacked)
    expect(frames.every(frame => frame.data.length <= limits.frame && !frame.reset)).toBe(true)
    screen.apply(frames)
    if (round % 2 === 0) continue
    fixture.terminals.ack({ id, viewer: 'v1', offset: screen.offset() }, caller)
    unacked = 0
  }
  while (screen.offset() < all.length) {
    fixture.tick()
    screen.apply(fixture.framesFor(caller))
    fixture.terminals.ack({ id, viewer: 'v1', offset: screen.offset() }, caller)
  }
  expect(most).toBe(limits.window)
  expect(all.length).toBeGreaterThan(3 * limits.window)
  expect(screen.text()).toBe(all)
})

test('a page that falls further behind than a screenful gets the recent screen instead of the backlog', async () => {
  const fixture = setup()
  const caller = page()
  await opened(fixture, caller)
  fixture.tick()
  const screen = createScreen()
  screen.apply(fixture.framesFor(caller))

  fixture.shells[0]!.events.output('\x1b[6n')
  for (let index = 0; index < 40_000; index++) fixture.shells[0]!.events.output(`line ${index}\r\n`)
  fixture.tick()
  const frames = fixture.framesFor(caller)
  expect(frames.length).toBeGreaterThan(0)
  expect(frames[0]!.reset).toBe(true)
  expect(frames[0]!.data.length).toBeLessThanOrEqual(limits.snapshot)
  expect(frames[0]!.data.startsWith('line ')).toBe(true)
  expect(frames[0]!.data.endsWith('line 39999\r\n')).toBe(true)
  screen.apply(frames)
  expect(screen.text().includes('\x1b[6n')).toBe(false)
})

test('a page that reattaches after a dropped link gets exactly what it missed, and an outdated one gets the screen', async () => {
  const fixture = setup()
  const first = page()
  const id = await opened(fixture, first)
  const screen = createScreen()
  fixture.shells[0]!.events.output('$ ')
  fixture.tick()
  screen.apply(fixture.framesFor(first))

  fixture.shells[0]!.events.output('ls\r\na.txt\r\n')
  fixture.terminals.left(first)
  fixture.shells[0]!.events.output('$ ')
  fixture.tick()
  expect(fixture.framesFor(first)).toEqual([])

  const second = page()
  fixture.terminals.attach({ id, viewer: 'v1', from: screen.offset(), ...size }, second)
  fixture.tick()
  const resumed = fixture.framesFor(second)
  expect(resumed.some(frame => frame.reset)).toBe(false)
  screen.apply(resumed)
  expect(screen.text()).toBe('$ ls\r\na.txt\r\n$ ')

  fixture.terminals.attach({ id, viewer: 'v1', from: screen.offset() - 3, ...size }, second)
  fixture.tick()
  screen.apply(fixture.framesFor(second))
  expect(screen.text()).toBe('$ ls\r\na.txt\r\n$ ')

  const fresh = createScreen()
  fixture.terminals.attach({ id, viewer: 'v2', from: null, ...size }, page())
  fixture.terminals.attach({ id, viewer: 'v3', from: 10_000, ...size }, page())
  fixture.tick()
  const replays = fixture.told.filter(entry => entry.event === 'terminal.output').map(entry => entry.payload as { reset?: true; data: string })
  expect(replays.map(frame => [frame.reset, frame.data])).toEqual([
    [true, '$ ls\r\na.txt\r\n$ '],
    [true, '$ ls\r\na.txt\r\n$ '],
  ])
  fresh.apply([replays[0] as never])
  expect(fresh.text()).toBe(screen.text())
})

test('input is applied once per batch, and only the page that typed last may answer the shell', async () => {
  const fixture = setup()
  const laptop = page()
  const phone = page('phone')
  const id = await opened(fixture, laptop, 'laptop')
  fixture.terminals.attach({ id, viewer: 'phone', from: null, ...size }, phone)
  const shell = fixture.shells[0]!

  fixture.terminals.input({ id, viewer: 'laptop', seq: 1, data: 'echo' }, laptop)
  fixture.terminals.input({ id, viewer: 'laptop', seq: 1, data: 'echo' }, laptop)
  fixture.terminals.input({ id, viewer: 'laptop', seq: 2, data: ' hi\r' }, laptop)
  fixture.terminals.input({ id, viewer: 'phone', seq: 1, data: '\x1b[12;1R' }, phone)
  fixture.terminals.input({ id, viewer: 'laptop', seq: 3, data: '\x1b[12;1R' }, laptop)
  fixture.terminals.input({ id, viewer: 'phone', seq: 2, data: 'q' }, phone)
  fixture.terminals.input({ id, viewer: 'phone', seq: 3, data: '\x1b[?62;22c' }, phone)
  expect(shell.typed).toEqual(['echo', ' hi\r', '\x1b[12;1R', 'q', '\x1b[?62;22c'])
})

test('the shell takes the size of the smallest page showing it, and grows back when that page goes', async () => {
  const fixture = setup()
  const laptop = page()
  const phone = page('phone')
  const id = await opened(fixture, laptop)
  const shell = fixture.shells[0]!
  fixture.terminals.resize({ id, viewer: 'v1', cols: 160, rows: 40 }, laptop)
  expect(shell.size).toEqual({ cols: 160, rows: 40 })

  expect(fixture.terminals.attach({ id, viewer: 'phone', from: null, cols: 44, rows: 50 }, phone).grid).toEqual({ cols: 44, rows: 40 })
  expect(shell.size).toEqual({ cols: 44, rows: 40 })
  expect(fixture.told.filter(entry => entry.event === terminalGrid.id && entry.caller === laptop).at(-1)?.payload).toEqual({ id, cols: 44, rows: 40 })

  fixture.terminals.left(phone)
  expect(shell.size).toEqual({ cols: 160, rows: 40 })
  fixture.terminals.detach({ id, viewer: 'v1' }, laptop)
  expect(shell.size).toEqual({ cols: 160, rows: 40 })
})

test('an exited shell drains its last output, says where it ended, and stays listed until closed', async () => {
  const fixture = setup()
  const caller = page()
  const id = await opened(fixture, caller)
  const screen = createScreen()
  fixture.shells[0]!.events.output('bye\r\n')
  fixture.shells[0]!.events.exit(3)
  screen.apply(fixture.framesFor(caller))
  expect(screen.text()).toBe('bye\r\n')
  expect(fixture.told.find(entry => entry.event === terminalExit.id)?.payload).toEqual({ id, session: 's1', code: 3, end: 5 })
  expect(fixture.terminals.list({ session: 's1' })).toEqual([{ id, cwd: '/work', exit: { code: 3, end: 5 } }])
  expect(() => fixture.terminals.input({ id, viewer: 'v1', seq: 1, data: 'x' }, caller)).toThrow('The shell has ended')

  fixture.terminals.close({ id })
  expect(fixture.terminals.list({ session: 's1' })).toEqual([])
  expect(() => fixture.terminals.attach({ id, viewer: 'v1', from: 0, ...size }, caller)).toThrow('That terminal has closed')
})
