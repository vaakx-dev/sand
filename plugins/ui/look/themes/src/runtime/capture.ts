import { readServerInfo } from '@sand/boot'
import { findBrowser, launch, type Browser } from '@sand/cdp'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import { removeFolder } from '@sand/util/fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface Screen {
  name: 'desktop' | 'phone'
  width: number
  height: number
  scale: number
}

export const screens: Screen[] = [
  { name: 'desktop', width: 1280, height: 800, scale: 1 },
  { name: 'phone', width: 390, height: 844, scale: 2 },
]

export interface Shot {
  screen: Screen
  png: Uint8Array
}

const timeoutMs = 30_000

const settleMs = 1_500

const flags = [
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-sync',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--mute-audio',
  'about:blank',
]

const signIn = (identity: { publicKey: string; secretKey: string }) =>
  `try { localStorage.setItem('sand.identity', ${JSON.stringify(JSON.stringify(identity))}); localStorage.setItem('sand.persist', '1') } catch {}`

const ready = `new Promise(done => {
  const started = Date.now()
  const look = () => document.querySelector('[data-part="composer"], [data-part="settings"]') || Date.now() - started > 15000 ? done(true) : setTimeout(look, 100)
  look()
})`

const shoot = async (browser: Browser, url: string, script: string, screen: Screen): Promise<Shot> => {
  const { targetId } = await browser.call<{ targetId: string }>('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await browser.call<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true })
  const call = <T>(method: string, params: object = {}) => browser.call<T>(method, params, sessionId)
  await call('Page.enable')
  await call('Emulation.setDeviceMetricsOverride', { width: screen.width, height: screen.height, deviceScaleFactor: screen.scale, mobile: screen.name === 'phone' })
  if (screen.name === 'phone') await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: script })
  await call('Page.navigate', { url })
  await call('Runtime.evaluate', { expression: ready, awaitPromise: true })
  await Bun.sleep(settleMs)
  const { data } = await call<{ data: string }>('Page.captureScreenshot', { format: 'png' })
  await browser.call('Target.closeTarget', { targetId })
  return { screen, png: Buffer.from(data, 'base64') }
}

export const noBrowser = 'No Chrome, Edge or Chromium was found on this PC, so the theme could not be checked in screenshots.'

export const captureSand = async (home: string, path: string) => {
  const info = await readServerInfo(home)
  if (!info) throw new Error('sand is not serving its page, so the theme could not be checked in screenshots.')
  const executable = await findBrowser()
  if (!executable) throw new Error(noBrowser)
  const { publicKey, secretKey } = await loadPcIdentity(home)
  const profile = await mkdtemp(join(tmpdir(), 'sand-theme-shot-'))
  try {
    const browser = await launch({ executable, profile, args: flags, deadline: Date.now() + timeoutMs })
    try {
      const url = new URL(path, info.url).href
      const script = signIn({ publicKey, secretKey })
      const shots: Shot[] = []
      for (const screen of screens) shots.push(await shoot(browser, url, script, screen))
      return shots
    } finally {
      await browser.close()
    }
  } finally {
    await removeFolder(profile)
  }
}
