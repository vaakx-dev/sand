import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type Locator, type Page } from 'playwright'
import { startSandbox } from './sandbox'

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let page: Page

const scaleOf = (image: Locator) => image.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a)

const shot = (width: number, height: number) => page.screenshot({ clip: { x: 0, y: 0, width, height } })

beforeAll(async () => {
  sand = await startSandbox([{ text: 'Two fine pictures' }])
  browser = await chromium.launch()
  page = await (await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 } })).newPage()
  await page.goto(sand.url)
  const box = page.getByRole('textbox').first()
  await box.waitFor()
  await page.locator('input[type=file]').first().setInputFiles([
    { name: 'harbor.png', mimeType: 'image/png', buffer: await shot(320, 200) },
    { name: 'lighthouse.png', mimeType: 'image/png', buffer: await shot(200, 320) },
  ])
  await box.fill('look at these')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('Two fine pictures').first().waitFor({ timeout: 20_000 })
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('picking another thumbnail shows it fitted after zooming the first', async () => {
  await page.getByRole('img', { name: 'harbor.png' }).first().click()
  const viewer = page.getByRole('dialog', { name: 'Image viewer' })
  const shown = viewer.locator('img').first()
  await shown.dblclick()
  await viewer.getByTitle('Fit to screen').filter({ hasText: /%$/ }).waitFor()
  expect(await scaleOf(shown)).toBeGreaterThan(1)

  await viewer.getByRole('button', { name: 'lighthouse.png' }).click()
  await viewer.locator('[aria-current="true"]', { has: page.getByRole('img', { name: 'lighthouse.png' }) }).waitFor()
  await viewer.getByTitle('Fit to screen').filter({ hasText: /^Fit$/ }).waitFor({ timeout: 2_000 })
  expect(await scaleOf(viewer.locator('img').first())).toBe(1)
}, 30_000)
