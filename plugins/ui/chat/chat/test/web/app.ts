import { afterAll, beforeAll, expect, test } from 'bun:test'
import { listen } from '@vaakx-dev/vrui'
import { chromium, type Browser, type BrowserContext, type Page, type Route, type WebSocketRoute } from 'playwright'
import { startSandbox } from './sandbox'

const APP_ORIGIN = 'https://sand.localhost'
const LAN_ORIGIN = 'https://pc.test'

let sand: Awaited<ReturnType<typeof startSandbox>>
let pc: URL
let browser: Browser
let app: BrowserContext

beforeAll(async () => {
  sand = await startSandbox([])
  pc = new URL(sand.url)
  browser = await chromium.launch()
  app = await pairedApp()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

const onPc = (url: string) => {
  const { pathname, search } = new URL(url)
  return `${pc.origin}${pathname}${search}`
}

const proxyToPc = async (route: Route) => {
  await route.fulfill({ response: await route.fetch({ url: onPc(route.request().url()) }) })
}

const refuseImages = async (route: Route) => (route.request().resourceType() === 'image' ? route.abort() : proxyToPc(route))

const pipeToPc = (page: WebSocketRoute) => {
  const socket = new WebSocket(onPc(page.url()).replace(/^http/, 'ws'))
  socket.binaryType = 'arraybuffer'
  const opened = new Promise(resolve => listen(socket, 'open', resolve))
  const stops = [
    listen<MessageEvent>(socket, 'message', ({ data }) => page.send(typeof data === 'string' ? data : Buffer.from(data))),
    listen<CloseEvent>(socket, 'close', ({ code, reason }) => page.close({ code, reason })),
  ]
  page.onMessage(message => void opened.then(() => socket.send(typeof message === 'string' ? message : new Uint8Array(message))))
  page.onClose(() => {
    stops.forEach(stop => stop())
    socket.close()
  })
}

const androidApp = async () => {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await context.addInitScript(routes => {
    Object.assign(window, { sandApp: Object.assign(new EventTarget(), { postMessage: () => {} }), sandAppStart: { routes, push: false, versionCode: 1 } })
  }, [LAN_ORIGIN])
  await context.route(`${APP_ORIGIN}/**`, proxyToPc)
  await context.route(`${LAN_ORIGIN}/**`, refuseImages)
  await context.routeWebSocket(`${LAN_ORIGIN.replace(/^https/, 'wss')}/**`, pipeToPc)
  return context
}

const pairedApp = async () => {
  const context = await androidApp()
  const page = await context.newPage()
  await page.goto(`${APP_ORIGIN}/${pc.hash}`)
  await page.waitForFunction(() => !location.hash.includes('pair='))
  await page.close()
  return context
}

const pictureOutcome = async (page: Page, name: string) => {
  const outcome = await page.waitForFunction(alt => {
    const shown = [...document.images].some(image => image.alt === alt && image.complete && image.naturalWidth > 0)
    if (shown) return 'shown'
    return document.body.innerText.includes('Image unavailable') && 'unavailable'
  }, name)
  return outcome.jsonValue()
}

test('in the Android app, Back closes the open menu first and only then lets the app leave the page', async () => {
  const page = await app.newPage()
  await page.goto(`${APP_ORIGIN}/`)
  await page.getByRole('textbox').first().waitFor()
  await page.locator('[aria-haspopup=menu]').first().click()
  const menu = page.getByRole('menu')
  await menu.waitFor()
  expect(await page.evaluate(() => window.sandAppBack?.())).toBe(true)
  await menu.waitFor({ state: 'detached' })
  expect(await page.evaluate(() => window.sandAppBack?.())).toBe(false)
  await page.close()
}, 60_000)

test('in the Android app, a chat picture loads through the page the app serves, since the WebView loads no pictures straight from the PC', async () => {
  const page = await app.newPage()
  await page.goto(`${APP_ORIGIN}/`)
  const box = page.getByRole('textbox').first()
  await box.waitFor()
  await page.locator('input[type=file]').first().setInputFiles({ name: 'tide.png', mimeType: 'image/png', buffer: await page.screenshot() })
  await box.fill('look at this')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.waitForURL(/view=thread/)
  await page.reload()
  expect(await pictureOutcome(page, 'tide.png')).toBe('shown')
  await page.close()
}, 60_000)
