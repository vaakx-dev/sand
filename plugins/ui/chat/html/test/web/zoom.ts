import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type CDPSession, type Locator, type Page } from 'playwright'
import { startSandbox } from './sandbox'

interface Point {
  x: number
  y: number
}

const TITLE = 'Four cards'

const DOUBLE_TAP_GAP_SECS = 0.08

const CARDS = { 'Card A': '#3a6ea5', 'Card B': '#a5563a', 'Card C': '#3aa56e', 'Card D': '#a59a3a' }

const card = (name: string, color: string) =>
  `<img alt="${name}" style="width:100%;display:block" src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${color}"/></svg>`)}">`

const PAGE = `<h1>Cards</h1><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${Object.entries(CARDS)
  .map(([name, color]) => card(name, color))
  .join('')}</div>`

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let page: Page
let hand: ReturnType<typeof fingers>

const fingers = (cdp: CDPSession) => {
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: Point[], timestamp?: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, id) => ({ ...point, id })), timestamp })
  const stroke = async (from: Point[], to: Point[], between: () => Promise<unknown>) => {
    const steps = 10
    await send('touchStart', from)
    for (let step = 1; step <= steps; step++) {
      await send(
        'touchMove',
        from.map((start, index) => ({ x: start.x + ((to[index]!.x - start.x) * step) / steps, y: start.y + ((to[index]!.y - start.y) * step) / steps })),
      )
      await between()
    }
    await send('touchEnd', [])
  }
  const tap = async (at: Point, timestamp?: number) => {
    await send('touchStart', [at], timestamp)
    await send('touchEnd', [], timestamp)
  }
  return {
    pinch: (center: Point, fromGap: number, toGap: number, between: () => Promise<unknown>) =>
      stroke(
        [
          { x: center.x - fromGap / 2, y: center.y },
          { x: center.x + fromGap / 2, y: center.y },
        ],
        [
          { x: center.x - toGap / 2, y: center.y },
          { x: center.x + toGap / 2, y: center.y },
        ],
        between,
      ),
    drag: (from: Point, to: Point) => stroke([from], [to], () => Bun.sleep(16)),
    tap,
    doubleTap: async (at: Point) => {
      const first = Date.now() / 1000
      await tap(at, first)
      await tap(at, first + DOUBLE_TAP_GAP_SECS)
    },
  }
}

const pointIn = async (node: Locator, across: number, down: number): Promise<Point> => {
  const box = (await node.boundingBox())!
  return { x: box.x + box.width * across, y: box.y + box.height * down }
}

const centerOf = (node: Locator) => pointIn(node, 0.5, 0.5)

const shareOf = async (node: Locator, { x, y }: Point) => {
  const box = (await node.boundingBox())!
  return { across: (x - box.x) / box.width, down: (y - box.y) / box.height }
}

const expectHeld = async (node: Locator, share: { across: number; down: number }, at: Point) => {
  const now = await pointIn(node, share.across, share.down)
  expect(Math.abs(now.x - at.x)).toBeLessThan(4)
  expect(Math.abs(now.y - at.y)).toBeLessThan(4)
}

const stageOf = (frame: Locator) =>
  frame.evaluate(node => {
    const content = node.parentElement!
    const scroller = content.parentElement!
    return { level: Number(content.style.zoom), left: scroller.scrollLeft }
  })

const rising = (levels: number[]) => levels.every((level, index) => index === 0 || level >= levels[index - 1]!)

const openFullScreen = async () => {
  await page.getByRole('button', { name: 'Open full screen' }).first().click()
  const sheet = page.getByRole('dialog', { name: `Full screen ${TITLE}` })
  const frame = sheet.locator('iframe')
  await frame.contentFrame().getByRole('img', { name: 'Card D' }).waitFor()
  return { sheet, frame }
}

const scaleOf = (image: Locator) => image.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a)

const offsetOf = (image: Locator) =>
  image.evaluate(node => {
    const matrix = new DOMMatrix(getComputedStyle(node).transform)
    return { x: matrix.e, y: matrix.f }
  })

beforeAll(async () => {
  sand = await startSandbox(TITLE, PAGE)
  browser = await chromium.launch()
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  page = await context.newPage()
  hand = fingers(await context.newCDPSession(page))
  await page.goto(sand.url)
  await page.getByRole('textbox').first().fill('Show me the cards')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('Here it is').first().waitFor({ timeout: 60_000 })
}, 90_000)

afterEach(async () => {
  const dialog = page.getByRole('dialog')
  if (await dialog.count()) await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await dialog.waitFor({ state: 'detached' })
})

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

const drawerOpen = () => page.evaluate(() => (document.querySelector('nav[aria-label="Sidebar"]')?.getBoundingClientRect().right ?? 0) > innerWidth / 2)

test('a full-screen page fits whole at full width, even when it lays out taller than in the chat', async () => {
  const { frame } = await openFullScreen()
  const inside = (await (await frame.elementHandle())!.contentFrame())!
  await inside.waitForFunction(() => document.querySelector('img[alt="Card D"]')!.getBoundingClientRect().bottom <= innerHeight + 1)
  const view = (await frame.boundingBox())!
  expect(view.y + view.height).toBeLessThanOrEqual(page.viewportSize()!.height)
}, 60_000)

test('a full-screen page zooms with the buttons and a quick pinch smoothly around the fingers, pans, and double-taps back to fit without the shell taking the swipe', async () => {
  const { sheet, frame } = await openFullScreen()
  const fitted = await stageOf(frame)

  const middle = await centerOf(frame.locator('xpath=../..'))
  const middleShare = await shareOf(frame, middle)
  await sheet.getByRole('button', { name: 'Zoom in' }).click()
  expect((await stageOf(frame)).level).toBeCloseTo(fitted.level * 1.4, 4)
  await expectHeld(frame, middleShare, middle)
  await sheet.getByRole('button', { name: 'Zoom out' }).click()
  expect((await stageOf(frame)).level).toBeCloseTo(fitted.level, 4)

  const focus = await centerOf(frame)
  const share = await shareOf(frame, focus)
  const levels: number[] = []
  await hand.pinch(focus, 60, 240, async () => levels.push((await stageOf(frame)).level))
  await sheet.getByTitle('Fit to screen').filter({ hasText: `${Math.round(fitted.level * 400)}%` }).waitFor()
  await expectHeld(frame, share, focus)
  expect(rising(levels)).toBe(true)
  const pinched = await stageOf(frame)
  expect(pinched.level).toBeCloseTo(fitted.level * 4, 2)

  await hand.drag({ x: 300, y: 500 }, { x: 120, y: 500 })
  const panned = await stageOf(frame)
  expect(panned.left).toBeGreaterThan(pinched.left + 100)

  await hand.drag({ x: 40, y: 500 }, { x: 300, y: 500 })
  expect((await stageOf(frame)).left).toBeLessThan(panned.left - 100)
  expect(await sheet.isVisible()).toBe(true)
  expect(await drawerOpen()).toBe(false)

  await hand.doubleTap(await centerOf(sheet))
  await sheet.getByTitle('Fit to screen').filter({ hasText: /^Fit$/ }).waitFor()
  expect(await stageOf(frame)).toMatchObject({ level: fitted.level })
}, 60_000)

test('an image opened from a page pinches, pans and double-taps back to fit without flipping or closing', async () => {
  await hand.tap(await centerOf(page.locator(`iframe[aria-label="${TITLE}"]`).contentFrame().getByRole('img', { name: 'Card A' })))
  const viewer = page.getByRole('dialog', { name: 'Image viewer' })
  const image = viewer.locator('img')
  await image.waitFor()

  const focus = await pointIn(image, 0.3, 0.6)
  const share = await shareOf(image, focus)
  await hand.pinch(focus, 40, 200, () => Bun.sleep(16))
  expect(await scaleOf(image)).toBeGreaterThan(3)
  await expectHeld(image, share, focus)

  const before = await offsetOf(image)
  await hand.drag(await centerOf(viewer), { x: 60, y: 300 })
  const after = await offsetOf(image)
  expect(after.x).toBeLessThan(before.x - 50)
  expect(await viewer.isVisible()).toBe(true)
  expect(await drawerOpen()).toBe(false)

  await hand.doubleTap(await centerOf(image))
  expect(await scaleOf(image)).toBe(1)
  expect(await offsetOf(image)).toEqual({ x: 0, y: 0 })
}, 60_000)
