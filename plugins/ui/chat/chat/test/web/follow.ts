import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import { newChat, startSandbox, type Reply } from './sandbox'

interface Place {
  fromEnd: number
  anchor: string
  offset: number
}

const paragraphs = (n: number) => Array.from({ length: 6 }, (_, at) => `Reply ${n} paragraph ${at + 1}: ${'lorem ipsum dolor sit amet '.repeat(8)}`).join('\n\n')

const seeded = 8
const follows = 5
const sizes: { name: string; options: BrowserContextOptions }[] = [
  { name: 'desktop', options: { viewport: { width: 1440, height: 900 } } },
  { name: 'phone', options: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]
const held = sizes.map((_, at) => seeded + (at + 1) * (follows + 1))
const replies: Reply[] = Array.from({ length: seeded + sizes.length * (follows + 1) }, (_, at) => ({ text: paragraphs(at + 1), hold: held.includes(at + 1) }))

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let state: string
let other: Page
let thread: string
let reply = 0

const scroller = `(() => {
  let el = [...document.querySelectorAll('p')].find(p => p.textContent?.startsWith('Reply ') && p.checkVisibility())
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

const replied = async (page: Page, text: string) => {
  reply++
  const box = other.getByRole('textbox').first()
  await box.fill(text)
  await box.press('Enter')
  await page.getByText(`Reply ${reply} paragraph 6`).waitFor({ state: 'attached' })
}

beforeAll(async () => {
  sand = await startSandbox(replies)
  browser = await chromium.launch()
  const pairing = await browser.newContext(sizes[0]!.options)
  other = await pairing.newPage()
  await other.goto(sand.url)
  await newChat(other)
  await Bun.sleep(1000)
  state = JSON.stringify(await pairing.storageState())
  await replied(other, 'message 1')
  await other.waitForURL(/view=thread/)
  thread = other.url()
  for (let n = 2; n <= seeded; n++) await replied(other, `message ${n}`)
}, 180_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

for (const { name, options } of sizes) {
  describe(`a thread on a ${name}`, () => {
    let page: Page

    beforeAll(async () => {
      page = await (await browser.newContext({ ...options, storageState: JSON.parse(state) })).newPage()
      page.setDefaultTimeout(10_000)
    }, 30_000)

    test('opens at the end and stays there as replies arrive', async () => {
      await page.goto(thread)
      await page.getByText(`Reply ${reply} paragraph 6`).waitFor({ state: 'attached' })
      expect((await settled(page)).fromEnd).toBeLessThanOrEqual(2)
      for (let follow = 0; follow < follows; follow++) {
        await replied(page, `follow ${reply + 1}`)
        expect((await settled(page)).fromEnd).toBeLessThanOrEqual(2)
      }
    }, 90_000)

    test('reading above keeps its place while a reply streams in and its turn ends', async () => {
      await scrollTo(page, 1500)
      const before = await place(page)
      await replied(page, 'stream')
      expect(await settled(page)).toEqual({ ...before, fromEnd: expect.any(Number) })
      await other.getByRole('button', { name: 'Stop' }).click()
      expect(await settled(page)).toEqual({ ...before, fromEnd: expect.any(Number) })
    }, 60_000)
  })
}
