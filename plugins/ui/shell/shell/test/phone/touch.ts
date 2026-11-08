import type { Route, Shell, ShellState } from '@sand/ui-shell/contract'
import { chromium, type BrowserContext, type CDPSession, type Page } from 'playwright'

declare global {
  interface Window {
    sand: {
      scopes(): { kind: string; name: string; status: string }[]
      settled(): Promise<void>
      get<T>(token: { id: string }): T | undefined
    }
  }
}

export interface Phone {
  page: Page
  cdp: CDPSession
}

interface Size {
  width: number
  height: number
}

const settleMs = 600

export const phones = [
  { name: 'iPhone 15', width: 390, height: 844 },
  { name: 'small Android', width: 360, height: 740 },
]

export const touchBrowser = async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: phones[0], hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  return { browser, context }
}

export const openAt = async (context: BrowserContext, url: string, { width, height }: Size): Promise<Phone> => {
  const page = await context.newPage()
  await page.setViewportSize({ width, height })
  await page.goto(url)
  await page.getByText('Fixtures').filter({ visible: true }).first().waitFor()
  return { page, cdp: await context.newCDPSession(page) }
}

export const until = async <T>(read: () => Promise<T>, done: (value: T) => boolean, ms = 3000) => {
  const deadline = Date.now() + ms
  let value = await read()
  while (!done(value) && Date.now() < deadline) {
    await Bun.sleep(50)
    value = await read()
  }
  return value
}

export const swipe = async ({ cdp }: Phone, from: [number, number], to: [number, number], { steps = 12, gapMs = 16 } = {}) => {
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  await touch('touchStart', ...from)
  for (let step = 1; step <= steps; step++) {
    await touch('touchMove', from[0] + ((to[0] - from[0]) * step) / steps, from[1] + ((to[1] - from[1]) * step) / steps)
    await Bun.sleep(gapMs)
  }
  await touch('touchEnd', ...to)
  await Bun.sleep(settleMs)
}

const routeNow = (page: Page) => page.evaluate(() => window.sand.get<Shell>({ id: 'shell' })?.current())

const screenOf = (route: Route | undefined) => (route ? [route.kind, route.id].filter(Boolean).join('/') : '')

export const screen = async (page: Page, expected?: string) =>
  expected ? until(async () => screenOf(await routeNow(page)), shown => shown === expected) : screenOf(await routeNow(page))

export const state = (page: Page) => page.evaluate(() => window.sand.get<Shell>({ id: 'shell' })?.state() satisfies ShellState | undefined)

export const tap = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).filter({ visible: true }).last().click()

const drawerShown = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector('nav[aria-label="Sidebar"]')?.getBoundingClientRect()
    return Boolean(box && box.width > 0 && box.right > box.width / 2)
  })

export const drawer = (page: Page, expected?: boolean) => (expected === undefined ? drawerShown(page) : until(() => drawerShown(page), shown => shown === expected))
