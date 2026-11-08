import type { Shell } from '@sand/ui-shell/contract'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Browser, BrowserContext } from 'playwright'
import { startSandbox } from './sand'
import { openAt, phones, screen, state, swipe, tap, touchBrowser, until, type Phone } from './touch'

const installedApp = () => {
  const query = matchMedia.bind(window)
  window.matchMedia = media => query(media === '(display-mode: standalone)' ? 'all' : media)
}

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
    await phone.page.getByRole('button', { name: /Plain screen/ }).click()
    expect(await screen(phone.page, 'fixture/plain')).toBe('fixture/plain')
  }

  test('the root is the home list, and a row pushes its screen into the address', async () => {
    const { page } = phone
    expect(await state(page)).toBe('phone')
    expect(await page.locator('nav[aria-label="Sidebar"]').count()).toBe(0)
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

  test('a swipe right pops a pushed screen, and a short one springs back', async () => {
    const { page } = phone
    await pushPlain()
    await swipe(phone, [60, mid()], [110, mid()])
    expect(await screen(page)).toBe('fixture/plain')
    await swipe(phone, [60, mid()], [size.width - 30, mid()])
    expect(await screen(page, 'home')).toBe('home')
    await swipe(phone, [60, mid()], [size.width - 30, mid()], flick)
    expect(await screen(page)).toBe('home')
  })

  test('the screen edge belongs to the browser in a tab, and swipes back in the installed app', async () => {
    await pushPlain()
    await swipe(phone, [4, mid()], [size.width - 30, mid()])
    expect(await screen(phone.page)).toBe('fixture/plain')

    const page = await context.newPage()
    await page.addInitScript(installedApp)
    await page.setViewportSize(size)
    await page.goto(phone.page.url())
    await page.getByText('Fixture plain').waitFor()
    await swipe({ page, cdp: await context.newCDPSession(page) }, [4, mid()], [size.width - 30, mid()])
    expect(await screen(page, 'home')).toBe('home')
    await page.close()
    await tap(phone.page, 'Back')
  })

  test('a sideways swipe over a wide table scrolls the table, then goes back', async () => {
    const { page } = phone
    await pushPlain()
    const table = page.locator('table').filter({ visible: true }).first()
    const box = (await table.boundingBox())!
    const y = box.y + box.height / 2
    const scrolled = () => table.evaluate(node => node.parentElement!.scrollLeft)
    await swipe(phone, [size.width - 60, y], [60, y])
    expect(await scrolled()).toBeGreaterThan(0)
    for (let swipes = 0; swipes < 4 && (await scrolled()) > 1; swipes++) {
      await swipe(phone, [60, y], [size.width - 60, y])
      expect(await screen(page)).toBe('fixture/plain')
    }
    expect(await scrolled()).toBeLessThanOrEqual(1)
    await swipe(phone, [60, y], [size.width - 30, y])
    expect(await screen(page, 'home')).toBe('home')
  })

  test('a screen with a side frame switches between its parts', async () => {
    const { page } = phone
    await page.getByRole('button', { name: /Split screen/ }).click()
    expect(await screen(page, 'fixture/split')).toBe('fixture/split')
    await page.getByRole('radio', { name: 'Project' }).click()
    expect(await page.getByText('Side content').isVisible()).toBe(true)
    expect(await page.getByText('Fixture split').isVisible()).toBe(false)
    await page.getByRole('radio', { name: 'Chat' }).click()
    expect(await page.getByText('Fixture split').isVisible()).toBe(true)
    await page.goBack()
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

  test('the header clears the notch, and the screens clear the home indicator', async () => {
    const { page, cdp } = phone
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } })
    const title = (await page.getByRole('heading', { name: 'sand', level: 1 }).boundingBox())!
    expect(title.y).toBeGreaterThanOrEqual(47)
    const settings = (await page.getByRole('button', { name: 'Settings', exact: true }).boundingBox())!
    expect(settings.y + settings.height).toBeLessThanOrEqual(size.height - 34)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: {} })
  })
})
