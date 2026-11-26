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

test('what is typed and edited before the editor has loaded shows at once, stays and sends', async () => {
  const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage()
  await page.goto(sand.url)
  await newChat(page)
  const editorLoads = Promise.withResolvers<void>()
  await page.route(
    url => url.pathname.startsWith('/assets/chunk-'),
    async route => {
      await editorLoads.promise
      await route.continue()
    },
  )
  await page.reload()
  const box = page.getByRole('textbox').first()
  await box.click()
  await page.keyboard.type('hello wrld')
  await page.keyboard.press('Control+Backspace')
  await page.keyboard.type('world')
  await page.keyboard.press('Enter')
  await page.keyboard.type('again')
  await page.getByText('again').first().waitFor()
  editorLoads.resolve()
  await page.locator('.cm-content').waitFor()
  expect(await box.innerText()).toBe('hello world\nagain')
  const send = page.getByRole('button', { name: 'Send' })
  await page.waitForFunction(() => document.querySelector('[aria-label="Send"]')?.getAttribute('aria-disabled') === 'false', undefined, { timeout: 10_000 })
  await send.click()
  await page.getByText('Hello from the thread').first().waitFor({ timeout: 10_000 })
  await page.close()
}, 60_000)
