import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Browser, BrowserContext, Page } from 'playwright'
import { startSandbox } from './sand'
import { openPhone, phoneBrowser, phones, send } from './touch'

const size = phones[0]!
const keyboardHeight = 336
const reply = Array.from({ length: 40 }, (_, line) => `Line ${line} of a long reply that fills the screen.`).join('\n\n')

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let context: BrowserContext
let thread: string

const fakeVisualViewport = () => {
  let shown: { top: number; height: number } | undefined
  const viewport = new EventTarget()
  Object.defineProperties(viewport, {
    scale: { get: () => 1 },
    offsetTop: { get: () => shown?.top ?? 0 },
    height: { get: () => shown?.height ?? window.innerHeight },
    width: { get: () => window.innerWidth },
  })
  Object.defineProperty(window, 'visualViewport', { get: () => viewport })
  Object.defineProperty(window, 'keyboardArea', {
    set(area?: { top: number; height: number }) {
      shown = area
      viewport.dispatchEvent(new Event('resize'))
    },
  })
}

const showKeyboard = (page: Page, area?: { top: number; height: number }) =>
  page.evaluate(next => Reflect.set(window, 'keyboardArea', next), area)

const measure = (page: Page) =>
  page.evaluate(() => {
    const box = (selector: string) => [...document.querySelectorAll(selector)].find(node => node.checkVisibility())!.getBoundingClientRect()
    const line = [...document.querySelectorAll('p')].findLast(node => node.textContent?.startsWith('Line 39'))!
    let scroller = line.parentElement!
    while (scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement!
    return {
      composer: box('textarea, [contenteditable]').bottom,
      header: box('[aria-label="Threads"]').top,
      fromBottom: scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
    }
  })

beforeAll(async () => {
  sand = await startSandbox([reply])
  ;({ browser, context } = await phoneBrowser())
  const { page } = await openPhone(context, sand.url, size)
  await send(page, 'long', 'Line 39')
  thread = page.url()
  await page.close()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('the composer stays above a keyboard that resizes the page, and the thread keeps its place', async () => {
  const { page } = await openPhone(context, thread, size)
  await page.getByText('Line 39').waitFor()
  await page.getByRole('textbox').first().click()
  await page.setViewportSize({ width: size.width, height: size.height - keyboardHeight })
  await Bun.sleep(300)
  const shown = await measure(page)
  expect(shown.composer).toBeLessThanOrEqual(size.height - keyboardHeight)
  expect(shown.header).toBeGreaterThanOrEqual(0)
  expect(shown.fromBottom).toBeLessThanOrEqual(2)
  await page.close()
})

test('the page fits above a keyboard that only shrinks the visual viewport, as on iOS', async () => {
  const page = await context.newPage()
  await page.addInitScript(fakeVisualViewport)
  await page.setViewportSize(size)
  await page.goto(thread)
  await page.getByText('Line 39').waitFor()
  await page.getByRole('textbox').first().click()
  const area = { top: 120, height: size.height - keyboardHeight }
  await showKeyboard(page, area)
  await Bun.sleep(300)
  const shown = await measure(page)
  expect(shown.header).toBeGreaterThanOrEqual(area.top)
  expect(shown.composer).toBeLessThanOrEqual(area.top + area.height)
  expect(shown.fromBottom).toBeLessThanOrEqual(2)
  await showKeyboard(page)
  await Bun.sleep(300)
  expect((await measure(page)).composer).toBeGreaterThan(area.top + area.height)
  await page.close()
})
