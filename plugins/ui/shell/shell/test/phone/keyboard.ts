import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Browser, BrowserContext, Page } from 'playwright'
import { startSandbox } from './sand'
import { openAt, phones, touchBrowser } from './touch'

const size = phones[0]!
const keyboardHeight = 336

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let context: BrowserContext
let screen: string

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

const showKeyboard = (page: Page, area?: { top: number; height: number }) => page.evaluate(next => Reflect.set(window, 'keyboardArea', next), area)

const measure = (page: Page) =>
  page.evaluate(() => {
    const box = (selector: string) => [...document.querySelectorAll(selector)].find(node => node.checkVisibility())!.getBoundingClientRect()
    return { composer: box('textarea').bottom, header: box('header').top }
  })

beforeAll(async () => {
  sand = await startSandbox()
  ;({ browser, context } = await touchBrowser())
  const { page } = await openAt(context, sand.url, size)
  await page.getByRole('button', { name: 'Show the sidebar' }).click()
  await page.getByRole('button', { name: /Plain screen/ }).click()
  await page.getByText('Fixture plain').waitFor()
  screen = page.url()
  await page.close()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('the composer stays above a keyboard that resizes the page', async () => {
  const { page } = await openAt(context, screen, size)
  await page.getByRole('textbox', { name: 'Message' }).click()
  await page.setViewportSize({ width: size.width, height: size.height - keyboardHeight })
  await Bun.sleep(300)
  const shown = await measure(page)
  expect(shown.composer).toBeLessThanOrEqual(size.height - keyboardHeight)
  expect(shown.header).toBeGreaterThanOrEqual(0)
  await page.close()
})

test('the page fits above a keyboard that only shrinks the visual viewport, as on iOS', async () => {
  const page = await context.newPage()
  await page.addInitScript(fakeVisualViewport)
  await page.setViewportSize(size)
  await page.goto(screen)
  await page.getByText('Fixture plain').waitFor()
  await page.getByRole('textbox', { name: 'Message' }).click()
  const area = { top: 120, height: size.height - keyboardHeight }
  await showKeyboard(page, area)
  await Bun.sleep(300)
  const shown = await measure(page)
  expect(shown.header).toBeGreaterThanOrEqual(area.top)
  expect(shown.composer).toBeLessThanOrEqual(area.top + area.height)
  await showKeyboard(page)
  await Bun.sleep(300)
  expect((await measure(page)).composer).toBeGreaterThan(area.top + area.height)
  await page.close()
})
