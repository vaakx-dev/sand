import { expect, test } from 'bun:test'
import type { Wire } from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'
import type { CreateScreen } from '../src/web/integrations/xterm'
import { createTab } from '../src/web/tab'

interface Call {
  id: string
  input: unknown
  reply(value: unknown): void
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

const pendingWire = () => {
  const calls: Call[] = []
  const call = <I, O>(request: Request<I, O>, input: I) => new Promise<O>(resolve => calls.push({ id: request.id, input, reply: resolve }))
  const wire: Wire = {
    ready: () => true,
    call,
    on: () => () => {},
    hello: () => undefined,
    fetch: () => Promise.reject(new Error('no fetch')),
    url: path => path,
  }
  const named = (id: string) => calls.filter(sent => sent.id === id)
  return { wire, named }
}

const createScreen: CreateScreen = () => ({
  attach: () => () => {},
  grid: () => {},
  write: () => {},
  reset: () => {},
  note: () => {},
  paste: () => {},
  focus: () => {},
  applicationCursor: () => false,
  paint: () => {},
  dispose: () => {},
})

const node = {} as HTMLElement

const tabOn = (wire: Wire, known?: { id: string; cwd: string }) =>
  createTab({ place: { session: 'thread-1', device: 'pc-1', cwd: () => '/work' }, wire, createScreen, colors: {}, closed: () => {}, known })

test('hiding and showing a terminal while its shell starts opens one shell', async () => {
  const { wire, named } = pendingWire()
  const tab = tabOn(wire)
  tab.mount(node)
  tab.visible(false)
  tab.visible(true)
  named('terminal.open')[0]?.reply({ id: 'shell-1' })
  await settle()

  expect(named('terminal.open')).toHaveLength(1)
  expect(tab.id()).toBe('shell-1')
  expect(named('terminal.detach')).toHaveLength(0)
})

test('a terminal hidden while it attaches detaches once the reply lands and attaches again when shown', async () => {
  const { wire, named } = pendingWire()
  const tab = tabOn(wire, { id: 'shell-1', cwd: '/work' })
  tab.mount(node)
  tab.visible(false)
  tab.visible(true)
  tab.visible(false)
  expect(named('terminal.attach')).toHaveLength(1)
  expect(named('terminal.detach')).toHaveLength(0)

  named('terminal.attach')[0]?.reply({ grid: { cols: 80, rows: 24 } })
  await settle()
  expect(named('terminal.detach').map(sent => sent.input)).toEqual([{ id: 'shell-1', viewer: expect.any(String) }])

  tab.visible(true)
  expect(named('terminal.attach')).toHaveLength(2)
})
