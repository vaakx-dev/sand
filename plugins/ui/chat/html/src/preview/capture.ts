import { findBrowser, launch, type Browser, type CdpEvent } from '@sand/cdp'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ConsoleLevel, ConsoleMessage, HtmlPreview } from '../contract'
import { pageHeight } from '../page/height'

const timeout = 20_000
const viewportHeight = 800
const maxCaptureHeight = 4_000
const maxConsole = 20
const maxConsoleText = 500
const settle = 120
const settleRounds = 12

const flags = [
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-sync',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--mute-audio',
  'about:blank',
]

const noBrowser =
  'No Chrome, Edge or Chromium was found on this machine, so this page cannot be checked or measured here. Publish it with html_render and pass a height you estimate, and say it was not checked.'

const levels: Partial<Record<string, ConsoleLevel>> = { log: 'log', debug: 'log', info: 'info', warn: 'warning', warning: 'warning', error: 'error', assert: 'error' }

interface RemoteObject {
  type: string
  value?: unknown
  description?: string
  preview?: { properties: { name: string; value?: string }[] }
}

type PageEvent =
  | { method: 'Runtime.consoleAPICalled'; params: { type: string; args: RemoteObject[] } }
  | { method: 'Runtime.exceptionThrown'; params: { exceptionDetails: { text: string; exception?: RemoteObject } } }
  | { method: 'Log.entryAdded'; params: { entry: { level: string; text: string } } }
  | { method: 'Page.loadEventFired'; params: object }

const textOf = ({ type, value, description, preview }: RemoteObject) =>
  preview ? `{ ${preview.properties.map(property => `${property.name}: ${property.value}`).join(', ')} }` : String(value ?? description ?? type)

const message = (level: ConsoleLevel | undefined, text: string): ConsoleMessage | undefined =>
  level && { level, text: text.length > maxConsoleText ? `${text.slice(0, maxConsoleText)}…` : text }

const consoleMessage = (event: PageEvent) => {
  if (event.method === 'Runtime.consoleAPICalled') return message(levels[event.params.type], event.params.args.map(textOf).join(' '))
  if (event.method === 'Runtime.exceptionThrown') {
    const { exception, text } = event.params.exceptionDetails
    return message('error', exception?.description ?? text)
  }
  if (event.method === 'Log.entryAdded') return message(levels[event.params.entry.level], event.params.entry.text)
  return undefined
}

const watch = (browser: Browser, sessionId: string) => {
  const messages: ConsoleMessage[] = []
  const loaded = Promise.withResolvers<void>()
  browser.on((event: CdpEvent) => {
    if (event.sessionId !== sessionId) return
    const page = event as PageEvent
    const logged = consoleMessage(page)
    if (logged) messages.push(logged)
    if (page.method === 'Page.loadEventFired') loaded.resolve()
  })
  return { console: () => messages.slice(-maxConsole), loaded: loaded.promise }
}

const render = async (browser: Browser, html: string, width: number, deadline: number): Promise<HtmlPreview> => {
  const { targetId } = await browser.call<{ targetId: string }>('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await browser.call<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true })
  const call = <T>(method: string, params: object = {}) => browser.call<T>(method, params, sessionId)
  const page = watch(browser, sessionId)

  await call('Page.enable')
  await call('Runtime.enable')
  await call('Log.enable')
  await call('Emulation.setDeviceMetricsOverride', { width, height: viewportHeight, deviceScaleFactor: 1, mobile: width < 480 })
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  const { frameTree } = await call<{ frameTree: { frame: { id: string } } }>('Page.getFrameTree')
  await call('Page.setDocumentContent', { frameId: frameTree.frame.id, html })
  await Promise.race([page.loaded, Bun.sleep(deadline - Date.now())])

  let height = 0
  for (let round = 0; round < settleRounds && Date.now() < deadline; round++) {
    const { result } = await call<{ result: { value: number } }>('Runtime.evaluate', { expression: `(${pageHeight})()`, returnByValue: true })
    if (result.value === height) break
    height = result.value
    await Bun.sleep(settle)
  }

  const { data } = await call<{ data: string }>('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height: Math.max(1, Math.min(height, maxCaptureHeight)), scale: 1 },
  })
  return { png: data, height, console: page.console() }
}

export const capture = async (html: string, width: number) => {
  const executable = await findBrowser()
  if (!executable) throw new Error(noBrowser)
  const deadline = Date.now() + timeout
  const profile = await mkdtemp(join(tmpdir(), 'sand-html-preview-'))
  try {
    const browser = await launch({ executable, profile, args: flags, deadline })
    try {
      return await render(browser, html, width, deadline)
    } finally {
      await browser.close()
    }
  } finally {
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
}
