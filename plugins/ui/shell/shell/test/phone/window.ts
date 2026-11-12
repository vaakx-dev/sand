import type { Shell } from '@sand/ui-shell/contract'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Browser, BrowserContext, Page } from 'playwright'
import { startSandbox } from './sand'
import { cover, drawer, openAt, phones, screen, state, swipe, tap, touchBrowser, until, type Phone } from './touch'

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

const chatScroll = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('div.overflow-y-auto')].find(node => node.textContent?.includes('Line 39'))?.scrollTop ?? -1)

const scrollChat = (page: Page, to: 'end' | number) =>
  page.evaluate(top => {
    const list = [...document.querySelectorAll('div.overflow-y-auto')].find(node => node.textContent?.includes('Line 39'))
    list?.scrollTo({ top: top === 'end' ? list.scrollHeight : top })
  }, to)

describe.each(phones)('on a $name', size => {
  let phone: Phone
  const mid = () => size.height / 2

  beforeAll(async () => {
    phone = await openAt(context, `${origin}/?keep=1`, size)
  }, 30_000)
  afterAll(() => phone.page.close())

  const pick = async (label: string, route: string) => {
    const { page } = phone
    expect(await drawer(page, false)).toBe(false)
    await tap(page, 'Show the sidebar')
    expect(await drawer(page, true)).toBe(true)
    await page.getByRole('button', { name: new RegExp(label) }).filter({ visible: true }).last().click()
    expect(await screen(page, route)).toBe(route)
    expect(await drawer(page, false)).toBe(false)
  }

  const openPlain = () => pick('Plain screen', 'fixture/plain')

  test('opening sand lands on Home, and a sidebar row replaces the chat in the address with no back arrow', async () => {
    const { page } = phone
    expect(await state(page)).toBe('phone')
    expect(await screen(page)).toBe('home')
    await openPlain()
    const address = new URL(page.url()).searchParams
    expect([address.get('view'), address.get('id'), address.get('keep')]).toEqual(['fixture', 'plain', '1'])
    expect(await page.getByRole('button', { name: 'Back', exact: true }).count()).toBe(0)
    await pick('Split screen', 'fixture/split')
    await page.goBack()
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    await page.goForward()
    expect(await screen(page, 'fixture/split')).toBe('fixture/split')
  })

  test('a route opened in place of an entry someone else pushed still goes back', async () => {
    const { page } = phone
    await openPlain()
    const before = page.url()
    await page.evaluate(() => {
      history.pushState({}, '', `${location.pathname}${location.search}&session=pushed`)
      window.sand.get<Shell>({ id: 'shell' })?.open({ kind: 'fixture', id: 'split' }, { replace: true })
    })
    expect(await screen(page, 'fixture/split')).toBe('fixture/split')
    expect(new URL(page.url()).searchParams.get('session')).toBe('pushed')
    await page.evaluate(() => window.sand.get<Shell>({ id: 'shell' })?.back())
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    expect(page.url()).toBe(before)
  })

  test('a swipe right slides the full-width sidebar over the chat, and a swipe left puts it away with the scroll kept', async () => {
    const { page } = phone
    await openPlain()
    await scrollChat(page, 300)
    const scrolled = await chatScroll(page)
    await swipe(phone, [60, mid()], [100, mid()])
    expect(await drawer(page, false)).toBe(false)
    await swipe(phone, [60, mid()], [size.width - 30, mid()])
    expect(await drawer(page, true)).toBe(true)
    const look = await page.evaluate(() => {
      const sidebar = document.querySelector('nav[aria-label="Sidebar"]')!
      const list = sidebar.querySelector('.overflow-y-auto')!
      return { width: sidebar.getBoundingClientRect().width, edge: getComputedStyle(sidebar).boxShadow, scrollbar: getComputedStyle(list).scrollbarWidth }
    })
    expect(look).toEqual({ width: size.width, edge: 'none', scrollbar: 'none' })
    await swipe(phone, [size.width - 30, mid()], [20, mid()], flick)
    expect(await drawer(page, false)).toBe(false)
    expect(await screen(page)).toBe('fixture/plain')
    expect(await chatScroll(page)).toBe(scrolled)
    await swipe(phone, [60, mid()], [size.width - 30, mid()], flick)
    expect(await drawer(page, true)).toBe(true)
    await tap(page, 'Hide the sidebar')
    expect(await drawer(page, false)).toBe(false)
    await swipe(phone, [60, mid()], [size.width - 30, mid()], flick)
    expect(await drawer(page, true)).toBe(true)
    await page.goBack()
    expect(await drawer(page, false)).toBe(false)
    expect(await screen(page)).toBe('fixture/plain')
  })

  test('a swipe left covers the chat with the details, then the side panel, and a swipe right shows the same chat', async () => {
    const { page } = phone
    await openPlain()
    await scrollChat(page, 300)
    const scrolled = await chatScroll(page)
    await swipe(phone, [size.width - 60, mid()], [size.width - 110, mid()])
    expect(await cover(page, 'Fixture details', false)).toBe(false)
    await swipe(phone, [size.width - 60, mid()], [30, mid()])
    expect(await cover(page, 'Fixture details', true)).toBe(true)
    expect(await screen(page)).toBe('fixture/plain')
    await swipe(phone, [size.width - 60, mid()], [30, mid()])
    expect(await cover(page, 'Fixture panel', true)).toBe(true)
    await swipe(phone, [60, mid()], [size.width - 30, mid()])
    expect(await cover(page, 'Fixture panel', false)).toBe(false)
    expect(await cover(page, 'Fixture details')).toBe(false)
    expect(await drawer(page)).toBe(false)
    expect(await chatScroll(page)).toBe(scrolled)
  })

  test('a swipe up at the end of a chat covers it with the terminal, and a swipe down puts it away', async () => {
    const { page } = phone
    await openPlain()
    await scrollChat(page, 0)
    await swipe(phone, [size.width / 2, mid()], [size.width / 2, mid() - 200])
    expect(await cover(page, 'Fixture terminal')).toBe(false)
    await scrollChat(page, 'end')
    await swipe(phone, [size.width / 2, mid()], [size.width / 2, 60])
    expect(await cover(page, 'Fixture terminal', true)).toBe(true)
    await swipe(phone, [size.width / 2, 120], [size.width / 2, size.height - 60])
    expect(await cover(page, 'Fixture terminal', false)).toBe(false)
    expect(await screen(page)).toBe('fixture/plain')
  })

  test('swipes from the right and bottom edges belong to the phone', async () => {
    const { page } = phone
    await openPlain()
    await scrollChat(page, 'end')
    await swipe(phone, [size.width - 4, mid()], [30, mid()])
    expect(await cover(page, 'Fixture details')).toBe(false)
    await swipe(phone, [size.width / 2, size.height - 4], [size.width / 2, 60])
    expect(await cover(page, 'Fixture terminal')).toBe(false)
  })

  test('a sideways swipe over a wide table scrolls the table first', async () => {
    const { page } = phone
    await openPlain()
    await scrollChat(page, 0)
    const table = page.locator('table').filter({ visible: true }).first()
    const box = (await table.boundingBox())!
    const y = box.y + box.height / 2
    const scrolled = () => table.evaluate(node => node.parentElement!.scrollLeft)
    await swipe(phone, [size.width - 60, y], [60, y])
    expect(await scrolled()).toBeGreaterThan(0)
    expect(await cover(page, 'Fixture details')).toBe(false)
    const before = await scrolled()
    await swipe(phone, [60, y], [size.width - 60, y])
    expect(await scrolled()).toBeLessThan(before)
    expect(await drawer(page)).toBe(false)
  })

  test('a swipe started while editing text never fires', async () => {
    const { page } = phone
    await openPlain()
    const field = page.getByRole('textbox', { name: 'Message' }).filter({ visible: true })
    await field.click()
    const box = (await field.boundingBox())!
    await swipe(phone, [box.x + 10, box.y + box.height / 2], [size.width - 30, box.y + box.height / 2])
    expect(await drawer(page)).toBe(false)
    await swipe(phone, [box.x + box.width - 10, box.y + box.height / 2], [30, box.y + box.height / 2])
    expect(await cover(page, 'Fixture details')).toBe(false)
  })

  test('the header button covers the chat with the details, and back or Close shows the same chat', async () => {
    const { page } = phone
    await openPlain()
    await tap(page, 'Fixture details')
    expect(await cover(page, 'Fixture details', true)).toBe(true)
    expect(await page.getByText('Details content').filter({ visible: true }).isVisible()).toBe(true)
    await page.goBack()
    expect(await cover(page, 'Fixture details', false)).toBe(false)
    expect(await screen(page)).toBe('fixture/plain')
    await tap(page, 'Fixture details')
    expect(await cover(page, 'Fixture details', true)).toBe(true)
    await tap(page, 'Close')
    expect(await cover(page, 'Fixture details', false)).toBe(false)
    expect(await screen(page)).toBe('fixture/plain')
  })

  test('Settings opens as the window, a page goes deeper, and Back or browser back walks out', async () => {
    const { page } = phone
    const plugins = () => page.getByRole('button', { name: 'Plugins', exact: true }).filter({ visible: true }).click()
    await openPlain()
    await tap(page, 'Show the sidebar')
    await tap(page, 'Settings')
    expect(await screen(page, 'settings')).toBe('settings')
    await plugins()
    expect(await screen(page, 'settings/plugins')).toBe('settings/plugins')
    await tap(page, 'Back')
    expect(await screen(page, 'settings')).toBe('settings')
    await tap(page, 'Back')
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
    await tap(page, 'Show the sidebar')
    await tap(page, 'Settings')
    await plugins()
    expect(await screen(page, 'settings/plugins')).toBe('settings/plugins')
    await page.goBack()
    expect(await screen(page, 'settings')).toBe('settings')
    await page.goBack()
    expect(await screen(page, 'fixture/plain')).toBe('fixture/plain')
  })

  test('browser back closes a sheet and keeps the window', async () => {
    const { page } = phone
    await openPlain()
    await tap(page, 'Show the sidebar')
    const before = page.url()
    await tap(page, 'Open sheet')
    const sheet = page.getByRole('dialog', { name: 'Fixture sheet' })
    await sheet.waitFor()
    await page.goBack()
    expect(await until(() => sheet.count(), count => count === 0)).toBe(0)
    expect(await screen(page)).toBe('fixture/plain')
    expect(new URL(page.url()).searchParams.get('id')).toBe(new URL(before).searchParams.get('id'))
  })
})

test('opening sand again lands in the last chat', async () => {
  const fresh = await touchBrowser()
  try {
    const { page } = await openAt(fresh.context, sand.url, phones[0]!)
    expect(await screen(page)).toBe('home')
    await tap(page, 'Show the sidebar')
    await page.getByRole('button', { name: /Chat screen/ }).filter({ visible: true }).last().click()
    expect(await screen(page, 'fixture/chat')).toBe('fixture/chat')
    await page.goto(origin)
    expect(await screen(page, 'fixture/chat')).toBe('fixture/chat')
  } finally {
    await fresh.browser.close()
  }
}, 30_000)
