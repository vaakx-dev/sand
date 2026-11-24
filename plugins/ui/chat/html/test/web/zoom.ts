import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type CDPSession, type Locator, type Page } from 'playwright'
import { startSandbox } from './sandbox'

interface Point {
  x: number
  y: number
}

const TITLE = 'Harbor tides'

const PIER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#3a6ea5"/><rect y="140" width="320" height="60" fill="#7a5a3a"/></svg>')}`

const PAGE = [
  '<h1>Tide table</h1>',
  ...Array.from({ length: 6 }, (_, row) => `<p>High water ${row + 1} rises over the breakwater and settles by the pier.</p>`),
  `<img src="${PIER}" alt="Pier at dawn" width="320" height="200">`,
].join('')

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let page: Page
let hand: ReturnType<typeof fingers>

const fingers = (cdp: CDPSession) => {
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: Point[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, id) => ({ ...point, id })) })
  const stroke = async (from: Point[], to: Point[], steps = 10) => {
    await send('touchStart', from)
    for (let step = 1; step <= steps; step++) {
      await send(
        'touchMove',
        from.map((start, index) => ({ x: start.x + ((to[index]!.x - start.x) * step) / steps, y: start.y + ((to[index]!.y - start.y) * step) / steps })),
      )
      await Bun.sleep(16)
    }
    await send('touchEnd', [])
  }
  const tap = async (at: Point) => {
    await send('touchStart', [at])
    await send('touchEnd', [])
  }
  return {
    pinch: (center: Point, fromGap: number, toGap: number) =>
      stroke(
        [
          { x: center.x - fromGap / 2, y: center.y },
          { x: center.x + fromGap / 2, y: center.y },
        ],
        [
          { x: center.x - toGap / 2, y: center.y },
          { x: center.x + toGap / 2, y: center.y },
        ],
      ),
    drag: (from: Point, to: Point) => stroke([from], [to]),
    tap,
    doubleTap: async (at: Point) => {
      await tap(at)
      await Bun.sleep(80)
      await tap(at)
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
  await page.getByRole('textbox').first().fill('Show me the tides')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('Here it is').first().waitFor({ timeout: 60_000 })
}, 90_000)

afterEach(async () => {
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
})

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

const drawerOpen = () => page.evaluate(() => (document.querySelector('nav[aria-label="Sidebar"]')?.getBoundingClientRect().right ?? 0) > innerWidth / 2)

test('a full-screen page pinches, pans and double-taps back to fit without the shell taking the swipe', async () => {
  await page.getByRole('button', { name: 'Open full screen' }).first().click()
  const sheet = page.getByRole('dialog', { name: `Full screen ${TITLE}` })
  const frame = sheet.locator('iframe')
  await frame.contentFrame().getByText('Tide table').waitFor()
  const fitted = await stageOf(frame)

  const focus = await centerOf(frame)
  const share = await shareOf(frame, focus)
  await hand.pinch(focus, 60, 240)
  await expectHeld(frame, share, focus)
  const pinched = await stageOf(frame)
  expect(pinched.level).toBeGreaterThan(fitted.level * 2)
  expect(await sheet.getByTitle('Fit to screen').innerText()).toMatch(/%$/)

  await hand.drag({ x: 300, y: 500 }, { x: 120, y: 500 })
  const panned = await stageOf(frame)
  expect(panned.left).toBeGreaterThan(pinched.left + 100)

  await hand.drag({ x: 40, y: 500 }, { x: 300, y: 500 })
  expect((await stageOf(frame)).left).toBeLessThan(panned.left - 100)
  expect(await sheet.isVisible()).toBe(true)
  expect(await drawerOpen()).toBe(false)

  await hand.doubleTap(await centerOf(sheet))
  expect(await stageOf(frame)).toMatchObject({ level: fitted.level })
  expect(await sheet.getByTitle('Fit to screen').innerText()).toBe('Fit')
}, 60_000)

test('an image opened from a page pinches, pans and double-taps back to fit without flipping or closing', async () => {
  await hand.tap(await centerOf(page.locator(`iframe[aria-label="${TITLE}"]`).contentFrame().getByRole('img', { name: 'Pier at dawn' })))
  const viewer = page.getByRole('dialog', { name: 'Image viewer' })
  const image = viewer.locator('img')
  await image.waitFor()

  const focus = await pointIn(image, 0.3, 0.6)
  const share = await shareOf(image, focus)
  await hand.pinch(focus, 40, 200)
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
