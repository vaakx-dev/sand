import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright'
import { newChat, startSandbox } from './sandbox'

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser

beforeAll(async () => {
  sand = await startSandbox([{ text: 'Hello from the thread' }])
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('after a reload inside a thread, the composer invites a reply', async () => {
  const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage()
  await page.goto(sand.url)
  await newChat(page)
  await page.getByRole('textbox').first().click()
  await page.keyboard.type('hi')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('Hello from the thread').first().waitFor({ timeout: 10_000 })
  await page.waitForURL(/view=thread/)
  await page.reload()
  await page.getByText('Hello from the thread').first().waitFor({ timeout: 10_000 })
  const composer = page.locator('[data-part=composer]').first()
  await composer.getByText('Reply', { exact: true }).waitFor({ timeout: 10_000 })
  expect(await composer.innerText()).not.toContain('Ask anything')
  await page.close()
}, 60_000)
