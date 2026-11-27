import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright'
import { newChat, startSandbox } from './sandbox'

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser

beforeAll(async () => {
  sand = await startSandbox([{ text: 'Ready.' }, { text: 'Working on it', hold: true }])
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('holding Enter in a thread sends the message once and leaves its turn running', async () => {
  const page = await browser.newPage()
  page.setDefaultTimeout(10_000)
  await page.goto(sand.url)
  await newChat(page)
  const box = page.getByRole('textbox').first()
  await box.fill('start')
  await box.press('Enter')
  await page.getByText('Ready.').waitFor()

  await box.fill('keep going')
  await page.keyboard.down('Enter')
  const stop = page.getByRole('button', { name: 'Stop' })
  await stop.waitFor()
  await page.keyboard.down('Enter')
  await page.keyboard.down('Enter')
  await page.keyboard.up('Enter')
  await page.getByText('Working on it').first().waitFor()
  await page.waitForTimeout(500)
  expect(await stop.isVisible()).toBe(true)
  expect(await page.getByText('keep going', { exact: true }).count()).toBe(1)
  await page.close()
}, 60_000)
