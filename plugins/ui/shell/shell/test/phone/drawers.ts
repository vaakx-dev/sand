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

describe('at 736 wide', () => {
  let phone: Phone
  const mid = tablet.height / 2

  beforeAll(async () => {
    phone = await openAt(context, `${origin}/?view=fixture&id=split`, tablet)
  }, 30_000)
  afterAll(() => phone.page.close())

  test('a screen without a side frame keeps the sidebar, and one with it turns the sidebar into a drawer', async () => {
    const { page } = phone
    expect(await state(page)).toBe('drawer')
    expect(await drawer(page)).toBe(false)
    await page.evaluate(() => window.sand.get<Shell>({ id: 'shell' })?.open({ kind: 'fixture', id: 'plain' }))
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    expect(await state(page)).toBe('wide')
    expect(await drawer(page)).toBe(true)
    await page.goBack()
    expect(await screen(page, 'fixture/split')).toBe('fixture/split')
    expect(await state(page)).toBe('drawer')
  })

  test('Back closes the open drawer before it leaves the screen', async () => {
    const { page } = phone
    const before = page.url()
    await tap(page, 'Show the sidebar')
    expect(await drawer(page, true)).toBe(true)
    await page.goBack()
    expect(await drawer(page, false)).toBe(false)
    expect(page.url()).toBe(before)
    expect(await screen(page)).toBe('fixture/split')
  })

  test('picking a row in the drawer closes it, and Back returns to the screen before', async () => {
    const { page } = phone
    await tap(page, 'Show the sidebar')
    expect(await drawer(page, true)).toBe(true)
    await page.getByRole('button', { name: /Plain screen/ }).click()
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    await page.goBack()
    expect(await screen(page, 'fixture/split')).toBe('fixture/split')
    expect(await drawer(page, false)).toBe(false)
  })

  test('swipes pull the drawer open and push it shut', async () => {
    const { page } = phone
    await swipe(phone, [60, mid], [400, mid])
    expect(await drawer(page, true)).toBe(true)
    await swipe(phone, [400, mid], [40, mid], flick)
    expect(await drawer(page, false)).toBe(false)
    expect(await screen(page)).toBe('fixture/split')
  })
})

describe('at 1280 wide', () => {
  test('hiding the side frame is remembered for its kind, and the header can show it again', async () => {
    const { page } = await openAt(context, `${origin}/?view=fixture&id=split`, { width: 1280, height: 800 })
    expect(await state(page)).toBe('wide')
    const side = page.getByRole('complementary', { name: 'Project' })
    await side.waitFor()
    await tap(page, 'Hide Project')
    expect(await until(() => side.count(), count => count === 0)).toBe(0)
    await page.reload()
    await page.getByText('Fixture split').waitFor()
    expect(await side.count()).toBe(0)
    await tap(page, 'Show Project')
    await side.waitFor()
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
