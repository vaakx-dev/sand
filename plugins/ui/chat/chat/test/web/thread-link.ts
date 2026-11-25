import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import { newChat, startSandbox } from './sandbox'

const linked = 'made-up-subagent-thread'
const reply = [`The tracks are merged; see [the merge](thread:${linked}) for details.\n\n`, 'Rebuilding ', 'now.']
const sizes: { name: string; options: BrowserContextOptions }[] = [
  { name: 'desktop', options: { viewport: { width: 1440, height: 900 } } },
  { name: 'phone', options: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let state: string
let driver: Page
let thread: string

const send = async (text: string) => {
  const box = driver.getByRole('textbox').first()
  await box.fill(text)
  await box.press('Enter')
}

beforeAll(async () => {
  sand = await startSandbox([{ text: 'Ready.' }, ...sizes.map(() => ({ text: reply, hold: true }))])
  browser = await chromium.launch()
  const pairing = await browser.newContext(sizes[0]!.options)
  driver = await pairing.newPage()
  driver.setDefaultTimeout(10_000)
  await driver.goto(sand.url)
  await newChat(driver)
  await Bun.sleep(1000)
  state = JSON.stringify(await pairing.storageState())
  await send('start')
  await driver.waitForURL(/view=thread/)
  await driver.getByText('Ready.').waitFor()
  thread = driver.url()
}, 90_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

describe.each(sizes)('$name', ({ options }) => {
  test('a thread link in a sentence keeps the sentence whole, and its card opens the thread after the reply streams in and ends', async () => {
    const page = await (await browser.newContext({ ...options, storageState: JSON.parse(state) })).newPage()
    page.setDefaultTimeout(10_000)
    await page.goto(thread)
    await page.getByText('Ready.').waitFor({ state: 'attached' })
    await send('merge them')
    const sentence = page.locator('[data-quote] p').filter({ hasText: 'The tracks are merged' }).last()
    const card = sentence.getByRole('button', { name: 'the merge' })
    await page.getByText('Rebuilding now.').waitFor()
    expect(await sentence.innerText()).toStartWith('The tracks are merged; see the merge for details.')
    await driver.getByRole('button', { name: 'Stop' }).click()
    await page.getByRole('button', { name: 'Stop' }).waitFor({ state: 'detached' })
    if (options.hasTouch) await card.tap()
    else await card.click()
    await page.waitForURL(new RegExp(linked))
    await page.close()
  }, 60_000)
})
