import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import { startSandbox, type Reply } from './sandbox'

interface Place {
  fromEnd: number
  anchor: string
  offset: number
}

const paragraphs = (n: number) => Array.from({ length: 6 }, (_, at) => `Reply ${n} paragraph ${at + 1}: ${'lorem ipsum dolor sit amet '.repeat(8)}`).join('\n\n')

const seeded = 8
const perSize = { follow: 2, held: 1, errand: 1 }
const sizes: { name: string; options: BrowserContextOptions }[] = [
  { name: 'desktop', options: { viewport: { width: 1440, height: 900 } } },
  { name: 'phone', options: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]
const held = sizes.map((_, at) => seeded + at * 4 + perSize.follow + 1)
const replies: Reply[] = Array.from({ length: seeded + sizes.length * 4 }, (_, at) => ({ text: paragraphs(at + 1), hold: held.includes(at + 1) }))

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let state: string
let other: Page
let chat: string
let errands: string
let reply = 0

const scroller = `(() => {
  let el = [...document.querySelectorAll('p')].find(p => p.textContent?.startsWith('Reply 1 paragraph 1'))
  while (el && getComputedStyle(el).overflowY !== 'auto') el = el.parentElement
  return el
})()`

const place = (page: Page) =>
  page.evaluate(`(() => {
    const el = ${scroller}
    const top = el.getBoundingClientRect().top
    const first = [...el.querySelectorAll('p')].find(p => p.getBoundingClientRect().bottom > top + 1 && p.textContent.startsWith('Reply'))
    return { fromEnd: Math.round(el.scrollHeight - el.clientHeight - el.scrollTop), anchor: first.textContent.slice(0, 20), offset: Math.round(first.getBoundingClientRect().top - top) }
  })()`) as Promise<Place>

const settled = async (page: Page) => {
  await Bun.sleep(1500)
  return place(page)
}

const scrollTo = async (page: Page, fromEnd: number) => {
  await page.evaluate(`(() => { const el = ${scroller}; el.scrollTop = el.scrollHeight - el.clientHeight - ${fromEnd} })()`)
  await Bun.sleep(600)
}

const send = async (page: Page, text: string) => {
  const box = page.getByRole('textbox').first()
  await box.fill(text)
  await box.press('Enter')
}

const replied = async (page: Page, text: string) => {
  reply++
  await send(other, text)
  await page.getByText(`Reply ${reply} paragraph 6`).waitFor({ state: 'attached' })
}

const pickBot = async (page: Page, name: string, phone: boolean) => {
  if (phone) await page.getByRole('button', { name: 'Show bots' }).click()
  await page.locator('[aria-label="Bots"]').getByText(name, { exact: true }).first().click()
}

const backInBots = (page: Page) => page.getByText('Reply 1 paragraph 1').waitFor({ state: 'attached' })

beforeAll(async () => {
  sand = await startSandbox(replies)
  browser = await chromium.launch()
  const pairing = await browser.newContext(sizes[0]!.options)
  const page = await pairing.newPage()
  await page.goto(sand.url)
  await page.getByRole('textbox').first().waitFor()
  await Bun.sleep(1000)
  state = JSON.stringify(await pairing.storageState())
  await pairing.close()

  other = await (await browser.newContext({ ...sizes[0]!.options, storageState: JSON.parse(state) })).newPage()
  const origin = new URL(sand.url).origin
  for (const template of ['Errands', 'Blank']) {
    await other.goto(`${origin}/?space=bots&bot=new`)
    await other.getByText(template, { exact: true }).click()
    await other.waitForURL(/bot=[0-9a-f-]{36}/)
  }
  chat = other.url()
  await other.goto(`${origin}/?space=bots`)
  await other.locator('[aria-label="Bots"]').getByText('Errands', { exact: true }).click()
  await other.waitForURL(url => url.href !== chat && /bot=[0-9a-f-]{36}/.test(url.href))
  errands = other.url()
  await other.goto(chat)
  for (let n = 1; n <= seeded; n++) await replied(other, `message ${n}`)
}, 180_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

for (const { name, options } of sizes) {
  const phone = name === 'phone'

  describe(`a bot chat on a ${name}`, () => {
    let page: Page

    beforeAll(async () => {
      page = await (await browser.newContext({ ...options, storageState: JSON.parse(state) })).newPage()
      page.setDefaultTimeout(10_000)
      await other.goto(chat)
      await other.getByRole('textbox').first().waitFor()
    }, 30_000)

    test('opens at the end and stays there as replies arrive', async () => {
      await page.goto(chat)
      await backInBots(page)
      expect((await settled(page)).fromEnd).toBeLessThanOrEqual(2)
      for (let follow = 0; follow < perSize.follow; follow++) {
        await replied(page, `follow ${reply + 1}`)
        expect((await settled(page)).fromEnd).toBeLessThanOrEqual(2)
      }
    }, 60_000)

    test('reading above keeps its place while a reply streams in and its turn ends', async () => {
      await scrollTo(page, 1500)
      const before = await place(page)
      await replied(page, 'stream')
      expect(await settled(page)).toEqual({ ...before, fromEnd: expect.any(Number) })
      await other.getByRole('button', { name: 'Stop' }).click()
      expect(await settled(page)).toEqual({ ...before, fromEnd: expect.any(Number) })
    }, 60_000)

    test('the place survives another bot getting newer, another space, the profile and another bot', async () => {
      const before = await place(page)
      await other.goto(errands)
      await replied(other, 'errand')
      expect(await settled(page)).toEqual(before)

      const spaces = page.getByRole('navigation', { name: 'Spaces' })
      await spaces.getByRole('link', { name: 'Threads' }).click()
      await spaces.getByRole('link', { name: 'Bots' }).click()
      await backInBots(page)
      expect(await settled(page)).toEqual(before)

      await page.getByTitle('Profile').click()
      await page.getByRole('button', { name: 'Back to the chat' }).click()
      await backInBots(page)
      expect(await settled(page)).toEqual(before)

      await pickBot(page, 'Errands', phone)
      await page.getByText(`Reply ${reply} paragraph 6`).waitFor({ state: 'attached' })
      await pickBot(page, 'New bot', phone)
      await backInBots(page)
      expect(await settled(page)).toEqual(before)
    }, 60_000)
  })
}
