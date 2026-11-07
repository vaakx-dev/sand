import { findBrowser, launch } from '@sand/cdp'
import { fitInside, osOf, type Computer, type Screenshot, type Size } from '@sand/computers/contract'
import { tabCommand, tabsNote } from './chords'
import { pageElements } from './elements'
import { findText } from './find'
import { dispatch, type Viewport } from './input'
import { settle } from './settle'
import { openTabs, type Call, type Tabs } from './tabs'

export interface BrowserOptions {
  id: string
  label: string
  profile: string
  headless: boolean
}

const startTimeout = 20_000

const noBrowser = 'No Chrome, Edge or Chromium was found on this machine. Install one, or set CHROME_PATH to its executable.'

const flagsFor = (headless: boolean) => [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-smooth-scrolling',
  ...(headless ? ['--headless=new', '--window-size=1280,800', '--hide-scrollbars'] : []),
  'about:blank',
]

export const pngSize = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

interface ViewportMetrics {
  clientWidth: number
  clientHeight: number
  pageX: number
  pageY: number
}

const metricsOf = (call: Call) => call<{ cssVisualViewport: ViewportMetrics; visualViewport: ViewportMetrics }>('Page.getLayoutMetrics')

const viewportOf = async (call: Call): Promise<Viewport> => {
  const { cssVisualViewport } = await metricsOf(call)
  return { width: cssVisualViewport.clientWidth, height: cssVisualViewport.clientHeight }
}

const capture = async (call: Call, fit: Size | undefined) => {
  const { cssVisualViewport: css, visualViewport: device } = await metricsOf(call)
  const scale = fitInside({ width: device.clientWidth, height: device.clientHeight }, fit).width / device.clientWidth
  const clip = { x: css.pageX, y: css.pageY, width: css.clientWidth, height: css.clientHeight, scale }
  const { data } = await call<{ data: string }>('Page.captureScreenshot', { format: 'png', ...(scale < 1 && { clip }) })
  return Buffer.from(data, 'base64')
}

export const browserComputer = ({ id, label, profile, headless }: BrowserOptions) => {
  let running: Promise<Tabs> | undefined

  const start = async () => {
    const executable = await findBrowser()
    if (!executable) throw new Error(noBrowser)
    const browser = await launch({ executable, profile, args: flagsFor(headless), deadline: Date.now() + startTimeout })
    return openTabs(browser).catch(async (error: unknown) => {
      await browser.close()
      throw error
    })
  }

  const tabs = () => {
    if (running) return running
    const started = start()
    running = started
    const forget = () => {
      if (running === started) running = undefined
    }
    started.then(({ browser }) => browser.closed.then(forget), forget)
    return started
  }

  const page = async () => (await tabs()).current()

  const computer: Required<Computer> & { close(): Promise<void> } = {
    info: { id, kind: 'browser', label, os: osOf(process.platform) },
    async screenshot(fit): Promise<Screenshot> {
      const open = await tabs()
      const png = await capture(await open.current(), fit)
      return { png, ...pngSize(png), note: tabsNote(await open.list()) }
    },
    async elements() {
      const call = await page()
      return pageElements(call, await viewportOf(call))
    },
    async act(action) {
      const open = await tabs()
      const command = action.type === 'key' ? tabCommand(action.keys) : undefined
      if (command) {
        await command(open)
        return
      }
      const call = await open.current()
      await dispatch(call, await viewportOf(call), action)
    },
    async settle() {
      await settle(await page())
    },
    async find(text, match) {
      const call = await page()
      return findText(call, await viewportOf(call), text, match)
    },
    async close() {
      const open = running
      running = undefined
      await open?.then(({ browser }) => browser.close(), () => undefined)
    },
  }
  return computer
}
