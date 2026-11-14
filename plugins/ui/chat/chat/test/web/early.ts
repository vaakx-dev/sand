import { afterAll, beforeAll, test } from 'bun:test'
import { chromium, type Browser } from 'playwright'
import { newChat, startSandbox } from './sandbox'

const editorDelayMs = 1500

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

test('what is typed before the editor has loaded shows at once, stays and sends', async () => {
  const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage()
  await page.goto(sand.url)
  await newChat(page)
  await page.route(
    url => url.pathname.startsWith('/assets/chunk-'),
    async route => {
      await Bun.sleep(editorDelayMs)
      await route.continue()
    },
  )
  await page.reload()
  const box = page.getByRole('textbox').first()
  await box.click()
  await page.keyboard.type('hello there')
  await page.getByText('hello there').first().waitFor({ timeout: 500 })
  const send = page.getByRole('button', { name: 'Send' })
  await page.waitForFunction(() => document.querySelector('[aria-label="Send"]')?.getAttribute('aria-disabled') === 'false', undefined, { timeout: 10_000 })
  await send.click()
  await page.getByText('Hello from the thread').first().waitFor({ timeout: 10_000 })
  await page.close()
}, 60_000)
