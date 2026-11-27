import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright'
import { newChat, startSandbox } from './sandbox'

const guess = 'Can you compare the two build configs and list what changed between them, then say which one is safer to ship this week?'

const phone = { width: 390, height: 844 }

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser

beforeAll(async () => {
  sand = await startSandbox([{ text: 'Hello from the thread' }, { text: guess }], ['guesses'])
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

const layout = (page: Page) =>
  page.evaluate(() => {
    const composer = [...document.querySelectorAll('[data-part=composer]')].find(node => node.checkVisibility())!
    const ghost = [...composer.querySelectorAll('[aria-label="Use this message"]')].find(node => node.checkVisibility())!.closest('span:not(.contents)')!
    const toolbar = composer.lastElementChild!
    return { ghost: ghost.getBoundingClientRect().bottom, toolbar: toolbar.getBoundingClientRect().top, lines: ghost.getClientRects().length }
  })

const expectClear = async (page: Page) => {
  await page.getByRole('button', { name: 'Use this message' }).filter({ visible: true }).first().waitFor({ timeout: 10_000 })
  const shown = await layout(page)
  expect(shown.lines).toBeGreaterThan(1)
  expect(shown.ghost).toBeLessThanOrEqual(shown.toolbar)
}

test('a guess that wraps over several lines on a phone stays above the toolbar, after a reload and a rotation too', async () => {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 }, hasTouch: true })
  const page = await context.newPage()
  await page.goto(sand.url)
  await newChat(page)
  await page.setViewportSize(phone)
  await page.getByRole('textbox').first().click()
  await page.keyboard.type('hi')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('Hello from the thread').first().waitFor({ timeout: 10_000 })
  await expectClear(page)

  await page.reload()
  await expectClear(page)

  await page.setViewportSize({ width: phone.height, height: phone.width })
  await page.setViewportSize(phone)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expectClear(page)
  await context.close()
}, 60_000)
