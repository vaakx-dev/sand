import type { Shell } from '@sand/ui-shell/contract'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Browser, BrowserContext } from 'playwright'
import { startSandbox } from './sand'
import { drawer, openAt, phones, screen, state, swipe, tap, touchBrowser, until, type Phone } from './touch'

const flick = { steps: 4, gapMs: 0 }

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let context: BrowserContext
let origin: string

beforeAll(async () => {
  sand = await startSandbox()
  ;({ browser, context } = await touchBrowser())
  const { page } = await openAt(context, sand.url, phones[0]!)
  await page.close()
  origin = new URL(sand.url).origin
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

describe.each(phones)('on a $name', size => {
  let phone: Phone
  const mid = () => size.height / 2

  beforeAll(async () => {
    phone = await openAt(context, `${origin}/?keep=1`, size)
  }, 30_000)
  afterAll(() => phone.page.close())

  const pushPlain = async () => {
    await phone.page.getByRole('button', { name: /Plain screen/ }).first().click()
    expect(await screen(phone.page, 'fixture/plain')).toBe('fixture/plain')
  }

  test('the root is the home list, and a row pushes its screen into the address', async () => {
    const { page } = phone
    expect(await state(page)).toBe('phone')
    await pushPlain()
    const address = new URL(page.url()).searchParams
    expect([address.get('view'), address.get('id'), address.get('keep')]).toEqual(['fixture', 'plain', '1'])
    await tap(page, 'Back')
    expect(await screen(page, 'home')).toBe('home')
    expect(new URL(page.url()).search).toBe('?keep=1')
  })

  test('browser back pops a pushed screen, and forward pushes it again', async () => {
    const { page } = phone
    await pushPlain()
    await page.goBack()
    expect(await screen(page, 'home')).toBe('home')
    await page.goForward()
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    await page.goBack()
    expect(await screen(page, 'home')).toBe('home')
  })

  test('a route opened in place of an entry someone else pushed still goes back', async () => {
    const { page } = phone
    const before = page.url()
    await page.evaluate(() => {
      history.pushState({}, '', `${location.pathname}${location.search}&session=pushed`)
      window.sand.get<Shell>({ id: 'shell' })?.open({ kind: 'fixture', id: 'plain' }, { replace: true })
    })
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    expect(new URL(page.url()).searchParams.get('session')).toBe('pushed')
    await tap(page, 'Back')
    expect(await screen(page, 'home')).toBe('home')
    expect(page.url()).toBe(before)
  })

  const scrolledToEnd = () =>
    phone.page.evaluate(() => {
      const list = [...document.querySelectorAll('div.overflow-y-auto')].find(node => node.textContent?.includes('Line 39'))
      list?.scrollTo({ top: list.scrollHeight })
    })

  test('a swipe right slides the sidebar over the chat, and a swipe left or a tap outside closes it in place', async () => {
    const { page } = phone
    await pushPlain()
    await swipe(phone, [60, mid()], [100, mid()])
    expect(await drawer(page, false)).toBe(false)
    await swipe(phone, [60, mid()], [size.width - 30, mid()])
    expect(await drawer(page, true)).toBe(true)
    expect(await screen(page)).toBe('fixture/plain')
    await swipe(phone, [250, mid()], [20, mid()])
    expect(await drawer(page, false)).toBe(false)
    expect(await screen(page)).toBe('fixture/plain')
    await swipe(phone, [60, mid()], [size.width - 30, mid()], flick)
    expect(await drawer(page, true)).toBe(true)
    await page.mouse.click(size.width - 20, mid())
    expect(await drawer(page, false)).toBe(false)
    expect(await screen(page)).toBe('fixture/plain')
    await tap(page, 'Back')
    expect(await screen(page, 'home')).toBe('home')
  })

  test('a row in the slid-over sidebar opens its chat', async () => {
    const { page } = phone
    await pushPlain()
    await swipe(phone, [60, mid()], [size.width - 30, mid()])
    expect(await drawer(page, true)).toBe(true)
    await page.getByRole('button', { name: /Split screen/ }).filter({ visible: true }).last().click()
    expect(await screen(page, 'fixture/split')).toBe('fixture/split')
    expect(await drawer(page, false)).toBe(false)
    await page.goto(`${origin}/?keep=1`)
    await page.getByText('Fixtures').filter({ visible: true }).first().waitFor()
  })

  test('a swipe left pulls in the details, a swipe right puts them away, and a short one springs back', async () => {
    const { page } = phone
    await pushPlain()
    await swipe(phone, [size.width - 60, mid()], [size.width - 110, mid()])
    expect(await screen(page)).toBe('fixture/plain')
    await swipe(phone, [size.width - 60, mid()], [30, mid()])
    expect(await screen(page, 'aside/fixture-aside')).toBe('aside/fixture-aside')
    expect(await page.getByText('Details content').filter({ visible: true }).isVisible()).toBe(true)
    await swipe(phone, [60, mid()], [size.width - 30, mid()])
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    await tap(page, 'Back')
  })

  test('a swipe up at the end of a chat pulls up the terminal, and a swipe down puts it away', async () => {
    const { page } = phone
    await pushPlain()
    await swipe(phone, [size.width / 2, mid()], [size.width / 2, mid() - 200])
    expect(await screen(page)).toBe('fixture/plain')
    await scrolledToEnd()
    await swipe(phone, [size.width / 2, mid()], [size.width / 2, 60])
    expect(await screen(page, 'aside/fixture-drawer')).toBe('aside/fixture-drawer')
    await swipe(phone, [size.width / 2, 120], [size.width / 2, size.height - 60])
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    await tap(page, 'Back')
  })

  test('swipes from the right and bottom edges belong to the phone', async () => {
    const { page } = phone
    await pushPlain()
    await scrolledToEnd()
    await swipe(phone, [size.width - 4, mid()], [30, mid()])
    expect(await screen(page)).toBe('fixture/plain')
    await swipe(phone, [size.width / 2, size.height - 4], [size.width / 2, 60])
    expect(await screen(page)).toBe('fixture/plain')
    await tap(page, 'Back')
  })

  test('a swipe on home does nothing', async () => {
    const { page } = phone
    await swipe(phone, [60, mid()], [size.width - 30, mid()])
    expect(await screen(page)).toBe('home')
    expect(await drawer(page)).toBe(false)
    await swipe(phone, [size.width - 60, mid()], [30, mid()])
    expect(await screen(page)).toBe('home')
  })

  test('a sideways swipe over a wide table scrolls the table first', async () => {
    const { page } = phone
    await pushPlain()
    const table = page.locator('table').filter({ visible: true }).first()
    const box = (await table.boundingBox())!
    const y = box.y + box.height / 2
    const scrolled = () => table.evaluate(node => node.parentElement!.scrollLeft)
    await swipe(phone, [size.width - 60, y], [60, y])
    expect(await scrolled()).toBeGreaterThan(0)
    expect(await screen(page)).toBe('fixture/plain')
    for (let swipes = 0; swipes < 4 && (await scrolled()) > 1; swipes++) await swipe(phone, [60, y], [size.width - 60, y])
    expect(await scrolled()).toBeLessThanOrEqual(1)
    expect(await drawer(page)).toBe(false)
    await tap(page, 'Back')
  })

  test('a swipe started while editing text never fires', async () => {
    const { page } = phone
    await pushPlain()
    const field = page.getByRole('textbox', { name: 'Message' }).filter({ visible: true })
    await field.click()
    const box = (await field.boundingBox())!
    await swipe(phone, [box.x + 10, box.y + box.height / 2], [size.width - 30, box.y + box.height / 2])
    expect(await drawer(page)).toBe(false)
    await swipe(phone, [box.x + box.width - 10, box.y + box.height / 2], [30, box.y + box.height / 2])
    expect(await screen(page)).toBe('fixture/plain')
    await tap(page, 'Back')
  })

  test('the header button opens the details as a screen, and back closes it', async () => {
    const { page } = phone
    await pushPlain()
    await tap(page, 'Fixture details')
    expect(await screen(page, 'aside/fixture-aside')).toBe('aside/fixture-aside')
    expect(await page.getByText('Details content').filter({ visible: true }).isVisible()).toBe(true)
    await page.goBack()
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    await tap(page, 'Back')
    expect(await screen(page, 'home')).toBe('home')
  })

  test('Settings pushes its list, then a page, and Back walks out', async () => {
    const { page } = phone
    await tap(page, 'Settings')
    expect(await screen(page, 'settings')).toBe('settings')
    await page.getByRole('button', { name: 'Plugins', exact: true }).filter({ visible: true }).click()
    expect(await screen(page, 'settings/plugins')).toBe('settings/plugins')
    await tap(page, 'Back')
    expect(await screen(page, 'settings')).toBe('settings')
    await page.getByLabel('Search settings').filter({ visible: true }).waitFor()
    await tap(page, 'Back')
    expect(await screen(page, 'home')).toBe('home')
  })

  test('browser back closes a sheet and keeps the screen', async () => {
    const { page } = phone
    const before = page.url()
    await tap(page, 'Open sheet')
    const sheet = page.getByRole('dialog', { name: 'Fixture sheet' })
    await sheet.waitFor()
    await page.goBack()
    expect(await until(() => sheet.count(), count => count === 0)).toBe(0)
    expect(page.url()).toBe(before)
    expect(await screen(page)).toBe('home')
  })
})
