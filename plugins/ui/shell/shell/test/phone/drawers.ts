import type { Shell } from '@sand/ui-shell/contract'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Browser, BrowserContext } from 'playwright'
import { startSandbox } from './sand'
import { drawer, openAt, screen, state, swipe, tap, touchBrowser, until, type Phone } from './touch'

const tablet = { width: 736, height: 900 }

const flick = { steps: 4, gapMs: 0 }

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let context: BrowserContext
let origin: string

beforeAll(async () => {
  sand = await startSandbox()
  ;({ browser, context } = await touchBrowser())
  const { page } = await openAt(context, sand.url, tablet)
  await page.close()
  origin = new URL(sand.url).origin
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

const asideShown = (page: import('playwright').Page) =>
  page.evaluate(() => {
    const card = document.querySelector('div[aria-label="Fixture details"]')
    return Boolean(card && card.getBoundingClientRect().width > 0)
  })

const roomFor = (page: import('playwright').Page) =>
  page.evaluate(() => {
    const field = [...document.querySelectorAll('textarea[aria-label="Message"]')].find(node => node.getBoundingClientRect().width > 0)
    const card = document.querySelector('div[aria-label="Fixture details"]')
    return Boolean(field && card && field.getBoundingClientRect().right <= card.getBoundingClientRect().left)
  })

describe('at 736 wide', () => {
  let phone: Phone
  const mid = tablet.height / 2

  beforeAll(async () => {
    phone = await openAt(context, `${origin}/?view=fixture&id=plain`, tablet)
  }, 30_000)
  afterAll(() => phone.page.close())

  test('the card floats over the screen and keeps the sidebar', async () => {
    const { page } = phone
    await page.evaluate(() => window.sand.get<Shell>({ id: 'shell' })?.showAside('fixture-aside', true))
    expect(await until(() => asideShown(page), shown => shown === true)).toBe(true)
    expect(await state(page)).toBe('wide')
    expect(await drawer(page, true)).toBe(true)
    expect(await roomFor(page)).toBe(false)
    await page.evaluate(() => window.sand.get<Shell>({ id: 'shell' })?.showAside('fixture-aside', false))
    expect(await until(() => asideShown(page), shown => shown === false)).toBe(false)
  })

  test('swipes pull the drawer open and push it shut', async () => {
    const { page } = phone
    await page.goto(`${origin}/?view=fixture&id=split`)
    expect(await until(() => state(page), shown => shown === 'drawer')).toBe('drawer')
    await swipe(phone, [60, mid], [400, mid])
    expect(await drawer(page, true)).toBe(true)
    await swipe(phone, [400, mid], [40, mid], flick)
    expect(await drawer(page, false)).toBe(false)
    expect(await screen(page)).toBe('fixture/split')
  })
})

describe('at 1280 wide', () => {
  test('the header button shows and hides the card, a roomy screen makes room for it, and the choice survives a reload', async () => {
    const { page } = await openAt(context, `${origin}/?view=fixture&id=plain`, { width: 1280, height: 800 })
    if (await asideShown(page)) await tap(page, 'Fixture details')
    expect(await until(() => asideShown(page), shown => shown === false)).toBe(false)
    await tap(page, 'Fixture details')
    expect(await until(() => asideShown(page), shown => shown === true)).toBe(true)
    expect(await roomFor(page)).toBe(true)
    await page.reload()
    await page.getByText('Fixture plain').waitFor()
    expect(await until(() => asideShown(page), shown => shown === true)).toBe(true)
    await tap(page, 'Fixture details')
    expect(await until(() => asideShown(page), shown => shown === false)).toBe(false)
    await page.goto(origin)
    expect(await page.getByRole('button', { name: 'Fixture details' }).count()).toBe(0)
    await page.close()
  })

  test('Escape closes a sheet', async () => {
    const { page } = await openAt(context, origin, { width: 1280, height: 800 })
    await tap(page, 'Open sheet')
    const sheet = page.getByRole('dialog', { name: 'Fixture sheet' })
    await sheet.waitFor()
    await page.keyboard.press('Escape')
    expect(await until(() => sheet.count(), count => count === 0)).toBe(0)
    await page.close()
  })
})
