import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright'
import type { ToastStack } from '../../src/contract'

const main = join(import.meta.dir, '../../../../../../apps/sand/src/main.ts')

const PAST_AUTO_DISMISS_MS = 7000
const TITLE = 'Saved the harbor tide tables'
const QUIET = '[features]\nthreads = false\nbots = false\nphone = false\nnotifications = false\nupdates = false\n'

const desktop: BrowserContextOptions = { viewport: { width: 1280, height: 800 } }
const phone: BrowserContextOptions = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }

const sand = async (home: string, ...args: string[]) => {
  const run = Bun.spawn([process.execPath, main, '--home', home, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = await Promise.all([new Response(run.stdout).text(), new Response(run.stderr).text(), run.exited])
  if (code !== 0) throw new Error(`sand ${args.join(' ')} failed: ${err || out}`)
  return out
}

const printed = (out: string, pattern: RegExp) => {
  const found = out.match(pattern)?.[1]?.trim()
  if (!found) throw new Error(`sand sandbox printed no ${pattern}:\n${out}`)
  return found
}

let box: string
let url: string
let browser: Browser

const openWithToast = async (options: BrowserContextOptions) => {
  const page = await (await browser.newContext(options)).newPage()
  await page.clock.install()
  await page.goto(url)
  await page.waitForFunction(() => window.sand?.get<ToastStack>({ id: 'toasts' }) !== undefined, undefined, { timeout: 30_000 })
  await page.evaluate(title => window.sand.get<ToastStack>({ id: 'toasts' })?.show({ tone: 'success', title }), TITLE)
  const toast = page.getByText(TITLE)
  await toast.waitFor()
  return { page, toast }
}

const waitPastAutoDismiss = (page: Page) => page.clock.runFor(PAST_AUTO_DISMISS_MS)

beforeAll(async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-toasts-'))
  await Bun.write(join(home, 'sandbox.toml'), QUIET)
  const out = await sand(home, 'sandbox')
  rmSync(home, { recursive: true, force: true })
  box = printed(out, /throwaway sand \(pid \d+\) in (.+)$/m)
  url = printed(out, /open it paired: (\S+)/)
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  if (!box) return
  await sand(box, 'stop')
  rmSync(box, { recursive: true, force: true })
})

test('a mouse over a toast holds it until the mouse leaves', async () => {
  const { page, toast } = await openWithToast(desktop)
  await toast.hover()
  await waitPastAutoDismiss(page)
  expect(await toast.isVisible()).toBe(true)
  await page.mouse.move(0, 0)
  await waitPastAutoDismiss(page)
  expect(await toast.isVisible()).toBe(false)
  await page.close()
}, 60_000)

test('tapping a toast on a phone does not keep it on screen', async () => {
  const { page, toast } = await openWithToast(phone)
  await toast.tap()
  await waitPastAutoDismiss(page)
  expect(await toast.isVisible()).toBe(false)
  await page.close()
}, 60_000)
