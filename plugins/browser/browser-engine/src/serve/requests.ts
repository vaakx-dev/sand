import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/kit'
import { z } from 'zod'
import { addressOf } from '../address'
import type { Browser } from '../contract'

const driver = z.enum(['agent', 'user'])

const historyAction = z.enum(['back', 'forward', 'reload'])

const modifiers = z.number().int().min(0).max(15)

const coordinate = z.number().finite()

const point = z.object({ x: coordinate, y: coordinate })

const userInput = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('mouse'),
    type: z.enum(['mousePressed', 'mouseReleased', 'mouseMoved']),
    x: coordinate,
    y: coordinate,
    button: z.enum(['none', 'left', 'middle', 'right']),
    clickCount: z.number().int().min(0).max(3),
    modifiers,
  }),
  z.object({ kind: z.literal('wheel'), x: coordinate, y: coordinate, deltaX: coordinate, deltaY: coordinate, modifiers }),
  z.object({
    kind: z.literal('key'),
    type: z.enum(['keyDown', 'keyUp']),
    key: z.string().max(32),
    code: z.string().max(32),
    keyCode: z.number().int().min(0).max(255),
    text: z.string().max(4).optional(),
    modifiers,
  }),
  z.object({ kind: z.literal('text'), text: z.string().max(100_000) }),
])

const viewport = z.object({
  width: z.number().int().min(240).max(3840),
  height: z.number().int().min(200).max(2400),
  scale: z.number().min(1).max(2),
})

export const serveRequests = (server: Server, browser: Browser) => {
  const existing = (thread: string) => {
    const tab = browser.find(thread)
    if (!tab) throw new Error('No browser tab is open for this thread')
    return tab
  }

  return joinDisposers(
    server.handle('browser.state', ({ thread }) => browser.find(thread)?.state() ?? null),
    server.handle('browser.open', async ({ thread, url }) => {
      const address = addressOf(url)
      const tab = await browser.tab(thread)
      await tab.open(address)
      return tab.state()
    }),
    server.handle('browser.history', ({ thread, action }) => existing(thread).history(historyAction.parse(action))),
    server.handle('browser.input', ({ thread, input }) => existing(thread).input(userInput.parse(input))),
    server.handle('browser.control', ({ thread, driver: next }) => existing(thread).control(driver.parse(next))),
    server.handle('browser.resize', ({ thread, viewport: size }) => existing(thread).resize(viewport.parse(size))),
    server.handle('browser.inspect', ({ thread, point: at }) => existing(thread).inspect(at && point.parse(at))),
    server.handle('browser.pick', ({ thread, point: at }) => existing(thread).pick(point.parse(at))),
    server.handle('browser.logs', ({ thread }) => existing(thread).logs()),
    server.handle('browser.close', ({ thread }) => browser.close(thread)),
  )
}
