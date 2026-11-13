import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright'
import { startSandbox } from './sandbox'

const LAYOUT_DELAY_MS = 200

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser

beforeAll(async () => {
  sand = await startSandbox([])
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('what is typed right after New thread stays in the new thread, however late the page lays out', async () => {
  const page = await browser.newPage()
  await page.addInitScript(delay => {
    const Native = window.ResizeObserver
    window.ResizeObserver = class extends Native {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => (document.body.dataset.slow ? void setTimeout(() => callback(entries, observer), delay) : callback(entries, observer)))
      }
    }
  }, LAYOUT_DELAY_MS)
  await page.goto(sand.url)
  await page.waitForURL(/view=draft/)
  await page.evaluate(() => (document.body.dataset.slow = 'yes'))
  await page.getByRole('button', { name: 'New thread' }).first().click()
  await page.getByRole('textbox').first().fill('hello')
  await page.waitForTimeout(LAYOUT_DELAY_MS * 2)
  expect(await page.getByRole('button', { name: 'Send' }).getAttribute('aria-disabled')).toBe('false')
}, 60_000)
