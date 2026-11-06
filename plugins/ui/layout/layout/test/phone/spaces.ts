import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Browser, BrowserContext, Page } from 'playwright'
import { startSandbox } from './sand'
import { openPhone, pane, phoneBrowser, phones, send, swipe, type Phone } from './touch'

const desktop = { width: 1440, height: 900 }

const spacesBar = (page: Page) => page.getByRole('navigation', { name: 'Spaces' })

const lit = (page: Page) => spacesBar(page).locator('[aria-current="page"]').evaluateAll(found => found.map(node => node.getAttribute('aria-label') ?? node.getAttribute('title')))

const current = async (page: Page) => new URLSearchParams((await spacesBar(page).locator('a[aria-current="page"]').getAttribute('href')) ?? '').get('space')

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let context: BrowserContext
let thread: string

beforeAll(async () => {
  sand = await startSandbox(['Hello from the thread'])
  ;({ browser, context } = await phoneBrowser())
  const { page } = await openPhone(context, sand.url, phones[0]!)
  await send(page, 'hello', 'Hello from the thread')
  thread = page.url()
  await page.close()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

describe('on a phone', () => {
  const size = phones[0]!
  let phone: Phone

  beforeAll(async () => {
    phone = await openPhone(context, thread, size)
  }, 30_000)
  afterAll(() => phone.page.close())

  test('the spaces sit in a tab bar along the bottom', async () => {
    const bar = (await spacesBar(phone.page).boundingBox())!
    expect(bar.y + bar.height).toBe(size.height)
    expect(await spacesBar(phone.page).innerText()).toContain('Pull requests')
    expect(await current(phone.page)).toBe('threads')
  })

  test('a space shows its own main column without the thread drawers, and Back returns to the thread', async () => {
    const { page } = phone
    await spacesBar(page).getByRole('link', { name: 'Pull requests' }).click()
    await page.getByRole('heading', { name: 'Pull requests' }).waitFor()
    expect(new URL(page.url()).searchParams.get('space')).toBe('pulls')
    expect(await page.getByText('Hello from the thread').isVisible()).toBe(false)
    await swipe(phone, [60, size.height / 2], [size.width - 60, size.height / 2])
    expect(await pane(page)).toBe('thread')
    await page.goBack()
    await page.getByText('Hello from the thread').waitFor()
    expect(page.url()).toBe(thread)
    expect(await current(page)).toBe('threads')
  })

  test('More holds Settings, and a tab leaves Settings for its space', async () => {
    const { page } = phone
    await page.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Close settings' }).first().waitFor()
    await spacesBar(page).getByRole('link', { name: 'Threads' }).click()
    await page.getByText('Hello from the thread').waitFor()
    expect(new URL(page.url()).searchParams.get('settings')).toBeNull()
  })
})

describe('on a desktop', () => {
  let page: Page

  beforeAll(async () => {
    page = await context.newPage()
    await page.setViewportSize(desktop)
    await page.goto(thread)
    await page.getByText('Hello from the thread').waitFor()
  }, 30_000)
  afterAll(() => page.close())

  test('the rail runs down the left edge, with the app-wide actions at its foot', async () => {
    const rail = (await spacesBar(page).boundingBox())!
    expect(rail.x).toBe(0)
    expect(rail.width).toBe(48)
    const reload = (await page.getByRole('button', { name: 'Reload plugins' }).boundingBox())!
    expect(reload.y + reload.height).toBeGreaterThan(desktop.height - 60)
    expect(await page.getByRole('heading', { name: 'Threads' }).isVisible()).toBe(true)
  })

  test('switching spaces swaps the side and main columns and keeps the thread for later', async () => {
    await spacesBar(page).getByRole('link', { name: 'Pull requests' }).click()
    await page.getByRole('heading', { name: 'Pull requests' }).waitFor()
    expect(await page.getByRole('heading', { name: 'Threads' }).isVisible()).toBe(false)
    expect(await current(page)).toBe('pulls')
    await spacesBar(page).getByRole('link', { name: 'Threads' }).click()
    await page.getByText('Hello from the thread').waitFor()
    expect(new URL(page.url()).searchParams.get('session')).toBe(new URL(thread).searchParams.get('session'))
    expect(new URL(page.url()).searchParams.get('pulls')).toBeNull()
  })

  test('Settings covers the space until a space is chosen, and the rail marks it instead of the space', async () => {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('heading', { name: 'Settings' }).waitFor()
    expect(await lit(page)).toEqual(['Settings'])
    await spacesBar(page).getByRole('button', { name: 'Usage' }).click()
    await page.getByRole('heading', { name: 'Usage' }).first().waitFor()
    expect(await lit(page)).toEqual(['Usage'])
    await spacesBar(page).getByRole('link', { name: 'Threads' }).click()
    await page.getByRole('heading', { name: 'Threads' }).waitFor()
    expect(await page.getByRole('heading', { name: 'Settings' }).isVisible()).toBe(false)
  })

  test('choosing a thread from another space lands in Threads', async () => {
    await spacesBar(page).getByRole('link', { name: 'Pull requests' }).click()
    await page.getByRole('heading', { name: 'Pull requests' }).waitFor()
    await page.keyboard.press('Control+k')
    await page.keyboard.type('hello')
    await page.getByRole('option', { name: /hello/ }).first().click()
    await page.getByText('Hello from the thread').waitFor()
    expect(new URL(page.url()).searchParams.get('space')).toBe('threads')
    expect(await current(page)).toBe('threads')
  })

  test('the space survives a reload', async () => {
    await spacesBar(page).getByRole('link', { name: 'Pull requests' }).click()
    await page.getByRole('heading', { name: 'Pull requests' }).waitFor()
    await page.reload()
    await page.getByRole('heading', { name: 'Pull requests' }).waitFor()
    expect(await current(page)).toBe('pulls')
  })
})
