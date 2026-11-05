import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Browser, BrowserContext } from 'playwright'
import { startSandbox } from './sand'
import { newThread, openPhone, phoneBrowser, pane, phones, pick, send, swipe, type Phone } from './touch'

const table = [
  'Wide table:',
  '',
  '| Column one | Column two | Column three | Column four | Column five | Column six |',
  '| --- | --- | --- | --- | --- | --- |',
  '| wide table cell content | wide table cell content | wide table cell content | wide | wide | wide |',
].join('\n')

const installedApp = () => {
  const query = matchMedia.bind(window)
  window.matchMedia = media => query(media === '(display-mode: standalone)' ? 'all' : media)
}

const flick = { steps: 4, gapMs: 0 }

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  sand = await startSandbox([table, 'Second reply'])
  ;({ browser, context } = await phoneBrowser())
  const { page } = await openPhone(context, sand.url, phones[0]!)
  await send(page, 'first', 'Wide table')
  await newThread(page)
  await send(page, 'second', 'Second reply')
  await page.close()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

describe.each(phones)('on a $name', size => {
  let phone: Phone
  const mid = () => size.height / 2

  beforeAll(async () => {
    phone = await openPhone(context, new URL(sand.url).origin, size)
    await pick(phone.page, 'second')
  }, 30_000)
  afterAll(() => phone.page.close())

  test('swipes move one step along sidebar, thread and panel', async () => {
    const { page } = phone
    const right = size.width - 60
    await swipe(phone, [60, mid()], [right, mid()])
    expect(await pane(page, 'side')).toBe('side')
    await swipe(phone, [size.width - 30, mid()], [0, mid()], flick)
    expect(await pane(page, 'thread')).toBe('thread')
    await swipe(phone, [right, mid()], [60, mid()])
    expect(await pane(page, 'aside')).toBe('aside')
    await swipe(phone, [30, mid()], [size.width, mid()], flick)
    expect(await pane(page, 'thread')).toBe('thread')
  })

  test('the screen edges belong to the browser in a tab, and open drawers in the installed app', async () => {
    const right = size.width - 60
    await swipe(phone, [4, mid()], [right, mid()])
    expect(await pane(phone.page)).toBe('thread')

    const page = await context.newPage()
    await page.addInitScript(installedApp)
    await page.setViewportSize(size)
    await page.goto(phone.page.url())
    await page.getByRole('textbox').first().waitFor()
    const installed = { page, cdp: await context.newCDPSession(page) }
    await swipe(installed, [4, mid()], [right, mid()])
    expect(await pane(page, 'side')).toBe('side')
    await page.goBack()
    await swipe(installed, [size.width - 4, mid()], [60, mid()])
    expect(await pane(page, 'aside')).toBe('aside')
    await page.close()
  })

  test('Back closes an open drawer before it leaves the thread', async () => {
    const { page } = phone
    const thread = page.url()
    await page.getByRole('button', { name: 'Threads', exact: true }).click()
    expect(await pane(page, 'side')).toBe('side')
    await page.goBack()
    expect(await pane(page, 'thread')).toBe('thread')
    expect(page.url()).toBe(thread)
  })

  test('picking a thread closes the sidebar, and Back returns to the thread before', async () => {
    const { page } = phone
    const before = page.url()
    await pick(page, 'first')
    expect(await pane(page, 'thread')).toBe('thread')
    await page.goBack()
    await page.waitForURL(before)
    expect(await pane(page)).toBe('thread')
  })

  test('a sideways swipe over a wide table scrolls the table, then the drawer', async () => {
    const { page } = phone
    await pick(page, 'first')
    await page.getByText('Column one').waitFor()
    const box = (await page.locator('table').first().boundingBox())!
    const y = box.y + box.height / 2
    const scrolled = () => page.locator('table').first().evaluate(node => node.parentElement!.scrollLeft)
    await swipe(phone, [size.width - 60, y], [60, y])
    expect(await pane(page)).toBe('thread')
    expect(await scrolled()).toBeGreaterThan(0)
    await swipe(phone, [60, y], [size.width - 60, y])
    await swipe(phone, [60, y], [size.width - 60, y])
    expect(await scrolled()).toBe(0)
    expect(await pane(page, 'side')).toBe('side')
    await page.goBack()
    expect(await pane(page, 'thread')).toBe('thread')
  })

  test('the sidebar clears the notch and the home indicator', async () => {
    const { page, cdp } = phone
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } })
    await page.getByRole('button', { name: 'Threads', exact: true }).click()
    expect(await pane(page, 'side')).toBe('side')
    const settings = (await page.locator('button:visible[aria-label="Settings"]').boundingBox())!
    const search = (await page.locator('button:visible', { hasText: 'Search' }).boundingBox())!
    expect(settings.y + settings.height).toBeLessThanOrEqual(size.height - 34)
    expect(search.y).toBeGreaterThanOrEqual(47)
    await page.goBack()
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: {} })
  })
})
