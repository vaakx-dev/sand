import { chromium, type BrowserContext, type CDPSession, type Page } from 'playwright'

export type Pane = 'side' | 'aside' | 'thread'

export interface Phone {
  page: Page
  cdp: CDPSession
}

const settleMs = 600

interface Size {
  width: number
  height: number
}

export const phones = [
  { name: 'iPhone 15', width: 390, height: 844 },
  { name: 'small Android', width: 360, height: 740 },
]

export const phoneBrowser = async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: phones[0], hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  return { browser, context }
}

export const openPhone = async (context: BrowserContext, url: string, { width, height }: Size): Promise<Phone> => {
  const page = await context.newPage()
  await page.setViewportSize({ width, height })
  await page.goto(url)
  await page.getByRole('textbox').first().waitFor()
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

const paneShown = (page: Page) =>
  page.evaluate((): Pane => {
    const shown = (label: string) => document.querySelector(`[aria-label="${label}"]`)?.checkVisibility() ?? false
    if (shown('Hide the sidebar')) return 'side'
    if (shown('Hide the panel')) return 'aside'
    return 'thread'
  })

export const pane = (page: Page, expected?: Pane) => (expected ? until(() => paneShown(page), shown => shown === expected) : paneShown(page))

export const send = async (page: Page, text: string, reply: string) => {
  await page.getByRole('textbox').first().fill(text)
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText(reply).first().waitFor()
}

export const pick = async (page: Page, title: string) => {
  const before = page.url()
  await page.getByRole('button', { name: 'Threads', exact: true }).click()
  await page.getByText(title, { exact: true }).filter({ visible: true }).first().click()
  await page.waitForURL(url => url.href !== before)
}

export const newThread = async (page: Page) => {
  await page.getByRole('button', { name: 'Threads', exact: true }).click()
  await page.locator('button:visible[aria-label="New thread"]').click()
  await page.keyboard.press('Enter')
  await pane(page, 'thread')
}
