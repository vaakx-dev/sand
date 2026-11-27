import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright'
import { startSandbox } from './sandbox'

const TITLE = 'Four cards'

const CARDS = { 'Card A': '#3a6ea5', 'Card B': '#a5563a', 'Card C': '#3aa56e', 'Card D': '#a59a3a' }

const card = (name: string, color: string) =>
  `<img alt="${name}" style="width:100%;display:block" src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${color}"/></svg>`)}">`

const PAGE = `<h1>Cards</h1><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${Object.entries(CARDS)
  .map(([name, color]) => card(name, color))
  .join('')}</div>`

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let page: Page

const openFullScreen = async () => {
  await page.getByRole('button', { name: 'Open full screen' }).first().click()
  const sheet = page.getByRole('dialog', { name: `Full screen ${TITLE}` })
  const frame = sheet.locator('iframe')
  await frame.contentFrame().getByRole('img', { name: 'Card D' }).waitFor()
  return frame
}

beforeAll(async () => {
  sand = await startSandbox(TITLE, PAGE)
  browser = await chromium.launch()
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  page = await context.newPage()
  await page.goto(sand.url)
  await page.getByRole('textbox').first().fill('Show me the cards')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('Here it is').first().waitFor({ timeout: 60_000 })
}, 90_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('a full-screen page fits whole at full width, even when it lays out taller than in the chat', async () => {
  const frame = await openFullScreen()
  const inside = (await (await frame.elementHandle())!.contentFrame())!
  await inside.waitForFunction(() => document.querySelector('img[alt="Card D"]')!.getBoundingClientRect().bottom <= innerHeight + 1)
  const view = (await frame.boundingBox())!
  expect(view.y + view.height).toBeLessThanOrEqual(page.viewportSize()!.height)
}, 60_000)
