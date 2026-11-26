import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import { newChat, startSandbox, type Reply } from './sandbox'

interface Place {
  fromEnd: number
  anchor: string
  offset: number
}

const paragraph = (n: number, at: number) => `Reply ${n} paragraph ${at + 1}: ${'lorem ipsum dolor sit amet '.repeat(8)}`
const paragraphs = (n: number) => Array.from({ length: 6 }, (_, at) => paragraph(n, at)).join('\n\n')

const seeded = 8
const follows = 5
const streamedParagraphs = 30
const SLOW_STEP_PX = 5
const SLOW_STEPS = 40
const SLOW_STEP_GAP_MS = 30
const sizes: { name: string; options: BrowserContextOptions }[] = [
  { name: 'desktop', options: { viewport: { width: 1440, height: 900 } } },
  { name: 'phone', options: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]
const LAYOUT_NUDGE_PX = 300
const GROWN_ABOVE_PX = 400
const perSize = follows + 2
const held = sizes.map((_, at) => seeded + at * perSize + follows + 1)
const streamed = sizes.map((_, at) => seeded + (at + 1) * perSize)
const replyFor = (n: number): Reply => {
  if (streamed.includes(n)) return { text: Array.from({ length: streamedParagraphs }, (_, at) => `${paragraph(n, at)}\n\n`) }
  return { text: paragraphs(n), hold: held.includes(n) }
}
const replies: Reply[] = Array.from({ length: seeded + sizes.length * perSize }, (_, at) => replyFor(at + 1))

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

const overScroller = (page: Page) => page.locator('[data-part="transcript"]:visible').hover({ force: true })

const scrollTo = async (page: Page, fromEnd: number) => {
  await overScroller(page)
  await page.mouse.wheel(0, (await place(page)).fromEnd - fromEnd)
  await Bun.sleep(600)
}

const layoutNudge = (page: Page) => page.evaluate(`${scroller}.scrollTop -= ${LAYOUT_NUDGE_PX}`)

const growRowsAbove = (page: Page) =>
  page.evaluate(`(() => {
    const first = [...document.querySelectorAll('p')].find(p => p.textContent?.startsWith('Reply '))
    const spacer = document.createElement('div')
    spacer.style.height = '${GROWN_ABOVE_PX}px'
    first.before(spacer)
  })()`)

const away = async (page: Page, meanwhile: () => Promise<unknown>) => {
  await page.getByRole('button', { name: 'New thread' }).first().dispatchEvent('click')
  await page.waitForURL(url => url.href !== thread)
  await meanwhile()
  await page.goBack()
  await page.getByText(/^Reply \d+ paragraph/).first().waitFor()
}

const sent = async (text: string) => {
  reply++
  const box = other.getByRole('textbox').first()
  await box.fill(text)
  await box.press('Enter')
}

const replied = async (page: Page, text: string) => {
  await sent(text)
  await page.getByText(`Reply ${reply} paragraph 6`).waitFor({ state: 'attached' })
}

const slowlyUp = async (page: Page) => {
  await overScroller(page)
  for (let step = 0; step < SLOW_STEPS; step++) {
    await page.mouse.wheel(0, -SLOW_STEP_PX)
    await Bun.sleep(SLOW_STEP_GAP_MS)
  }
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

    test('scrolling up slowly while a reply streams in lets go of the end', async () => {
      await scrollTo(page, 0)
      await sent('slow')
      await page.getByText(`Reply ${reply} paragraph 2`).waitFor({ state: 'attached' })
      await slowlyUp(page)
      const before = await place(page)
      expect(await settled(page)).toEqual({ ...before, fromEnd: expect.any(Number) })
      expect((await place(page)).fromEnd).toBeGreaterThan(before.fromEnd)
      await expect(page.getByRole('button', { name: 'Jump to latest' }).isVisible()).resolves.toBe(true)
      await page.getByText(`Reply ${reply} paragraph ${streamedParagraphs}`).waitFor({ state: 'attached', timeout: 20_000 })
    }, 60_000)

    test('a chat at the end stays there through layout shifts, leaving and coming back', async () => {
      await page.getByRole('button', { name: 'Jump to latest' }).click()
      await layoutNudge(page)
      expect((await settled(page)).fromEnd).toBeLessThanOrEqual(2)
      await away(page, () => growRowsAbove(page))
      expect((await settled(page)).fromEnd).toBeLessThanOrEqual(2)
    }, 30_000)

    test('a chat read above comes back on the same message after leaving', async () => {
      await scrollTo(page, 1500)
      const before = await place(page)
      await away(page, () => growRowsAbove(page))
      expect(await settled(page)).toEqual({ ...before, fromEnd: expect.any(Number) })
    }, 30_000)
  })
}
