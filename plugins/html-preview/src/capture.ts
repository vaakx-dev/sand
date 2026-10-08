import { join } from 'node:path'
import { launch, type Page } from './cdp'
import { collect, exceptionText, type Console, type ConsoleMessage } from './console'
import { tiles, type Region } from './tiles'

export interface Shot {
  width: number
  maxHeight: number
  scale: number
  script?: string
  selector?: string
}

export interface Capture {
  contentHeight: number
  region: Region
  shownHeight: number
  images: string[]
  messages: ConsoleMessage[]
}

const settleMs = 1000
const viewportHeight = 900

const measure = `(() => {
  const root = document.documentElement
  return Math.ceil(root.scrollHeight > root.clientHeight ? root.scrollHeight : root.getBoundingClientRect().height)
})()`

const painted = 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'

const elementRect = (selector: string) => `(() => {
  scrollTo(0, 0)
  const element = document.querySelector(${JSON.stringify(selector)})
  if (!element) return null
  const { x, y, width, height } = element.getBoundingClientRect()
  return { x, y, width, height }
})()`

const loaded = (page: Page) => new Promise<void>(resolve => page.on('Page.loadEventFired', () => resolve()))

const evaluate = async (page: Page, expression: string) =>
  (await page.send<{ result: { value: unknown } }>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value

const runScript = async (page: Page, script: string, output: Console) => {
  const expression = `(async () => {\n${script}\n})()`
  const { exceptionDetails } = await page.send('Runtime.evaluate', { expression, awaitPromise: true, userGesture: true })
  if (exceptionDetails) output.add('error', `script: ${exceptionText(exceptionDetails)}`)
  await evaluate(page, painted)
}

const aborted = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    const fail = () => reject(signal.reason instanceof Error && signal.reason.name !== 'TimeoutError' ? signal.reason : new Error('The preview timed out'))
    if (signal.aborted) fail()
    else signal.addEventListener('abort', fail, { once: true })
  })

const clamp = (rect: Region, width: number, height: number): Region => {
  const x = Math.max(0, Math.floor(rect.x))
  const y = Math.max(0, Math.floor(rect.y))
  return { x, y, width: Math.min(width, Math.ceil(rect.x + rect.width)) - x, height: Math.min(height, Math.ceil(rect.y + rect.height)) - y }
}

const regionOf = async (page: Page, selector: string | undefined, width: number, height: number): Promise<Region> => {
  if (!selector) return { x: 0, y: 0, width, height }
  const rect = (await evaluate(page, elementRect(selector))) as Region | null
  if (!rect) throw new Error(`No element matches ${selector}`)
  const region = clamp(rect, width, height)
  if (region.width <= 0 || region.height <= 0) throw new Error(`${selector} has no visible area on the page`)
  return region
}

const render = async (page: Page, dir: string, html: string, shot: Shot): Promise<Capture> => {
  const output = collect(page)
  const metrics = (height: number) => ({ width: shot.width, height, deviceScaleFactor: shot.scale, mobile: shot.width < 500 })
  await Promise.all(['Page.enable', 'Runtime.enable', 'Log.enable'].map(method => page.send(method)))
  await page.send('Emulation.setDeviceMetricsOverride', metrics(viewportHeight))
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  const file = join(dir, 'page.html')
  await Bun.write(file, html)
  const load = loaded(page)
  await page.send('Page.navigate', { url: Bun.pathToFileURL(file).href })
  await load
  await evaluate(page, `document.fonts.ready.then(() => new Promise(resolve => setTimeout(resolve, ${settleMs})))`)
  if (shot.script) await runScript(page, shot.script, output)
  const contentHeight = Number(await evaluate(page, measure))
  const pageHeight = Math.min(Math.max(contentHeight, 1), shot.maxHeight)
  await page.send('Emulation.setDeviceMetricsOverride', metrics(pageHeight))
  await evaluate(page, painted)
  const region = await regionOf(page, shot.selector, shot.width, pageHeight)
  const parts = tiles(region, shot.scale)
  const images: string[] = []
  for (const clip of parts) images.push((await page.send<{ data: string }>('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })).data)
  const shownHeight = parts.reduce((sum, part) => sum + part.height, 0)
  const folder = `${Bun.pathToFileURL(dir).href}/`
  const messages = output.messages.map(message => ({ ...message, text: message.text.replaceAll(folder, '') }))
  return { contentHeight, region, shownHeight, images, messages }
}

export const capture = async (executable: string, html: string, shot: Shot, signal: AbortSignal) => {
  const browser = await launch(executable)
  try {
    return await Promise.race([browser.open().then(page => render(page, browser.dir, html, shot)), aborted(signal)])
  } finally {
    await browser.close()
  }
}
