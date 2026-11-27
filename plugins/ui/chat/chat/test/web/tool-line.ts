import { until } from '@sand/harness/until'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import { newChat, startSandbox } from './sandbox'

const pattern = 'packages/storefront/src/components/**/checkout-summary.stories.tsx'

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser

beforeAll(async () => {
  sand = await startSandbox([{ text: 'Looking for the stories.', call: { name: 'glob', input: { pattern } } }, { text: 'None found.' }])
  browser = await chromium.launch()
  const { context, page } = await openPage({})
  await newChat(page)
  await page.getByRole('textbox').first().click()
  await page.keyboard.type('find the stories')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('None found.').first().waitFor({ timeout: 15_000 })
  await context.close()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

async function openPage(options: BrowserContextOptions) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 }, ...options })
  const page = await context.newPage()
  await page.goto(await sand.pairedUrl())
  return { context, page }
}

const openTool = async (options: BrowserContextOptions) => {
  const { context, page } = await openPage(options)
  await page.getByText('find the stories').first().click()
  await page.getByRole('button', { name: /Worked for/ }).filter({ visible: true }).first().click()
  return { context, page, line: page.locator('button[aria-expanded]', { hasText: pattern }).filter({ visible: true }).first() }
}

const measure = (page: Page) =>
  page.evaluate(text => {
    const button = [...document.querySelectorAll('button[aria-expanded]')].find(node => node.textContent?.includes(text) && node.checkVisibility())!
    const head = button.parentElement!
    const copy = head.querySelector('[aria-label="Copy"]')
    return {
      spare: head.getBoundingClientRect().right - button.getBoundingClientRect().right,
      actions: copy?.checkVisibility({ opacityProperty: true }) ?? false,
    }
  }, pattern)

test('a collapsed tool line on a phone gives its whole width to the label, and shows its actions once opened', async () => {
  const { context, page, line } = await openTool({ hasTouch: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await line.waitFor()
  expect(await measure(page)).toEqual({ spare: 0, actions: false })

  await line.tap()
  await until(async () => (await measure(page)).actions)
  await context.close()
}, 60_000)

test('a tool line on a desktop keeps room for its actions and shows them on hover', async () => {
  const { context, page, line } = await openTool({})
  await line.waitFor()
  const idle = await measure(page)
  expect(idle.actions).toBe(false)
  expect(idle.spare).toBeGreaterThan(0)

  await line.hover()
  expect(await until(async () => {
    const shown = await measure(page)
    return shown.actions && shown
  })).toEqual({ spare: idle.spare, actions: true })
  await context.close()
}, 60_000)
