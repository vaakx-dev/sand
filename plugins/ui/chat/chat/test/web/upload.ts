import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright'
import { startSandbox } from './sandbox'

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser

beforeAll(async () => {
  sand = await startSandbox([{ text: 'Nice picture' }])
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('a screenshot sent from a phone uploads and reaches the chat', async () => {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto(sand.url)
  const box = page.getByRole('textbox').first()
  await box.waitFor()
  await page.locator('input[type=file]').first().setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: await page.screenshot() })
  await box.fill('look at this')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('Nice picture').first().waitFor({ timeout: 20_000 })
  expect(await page.locator('body').innerText()).not.toMatch(/didn.t upload/)
  await context.close()
}, 60_000)
