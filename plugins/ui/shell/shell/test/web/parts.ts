import { pageParts, type PagePart } from '@sand/ui-shell/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'

const main = join(import.meta.dir, '../../../../../../apps/sand/src/main.ts')

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
const seen = new Set<string>()

const visible = (page: Page) =>
  page.evaluate(
    names =>
      names.filter(name =>
        [...document.querySelectorAll(`[data-part="${name}"]`)].some(node => {
          const box = node.getBoundingClientRect()
          return box.width > 0 && box.height > 0
        }),
      ),
    Object.keys(pageParts),
  )

const look = async (page: Page) => {
  for (const name of await visible(page)) seen.add(name)
}

beforeAll(async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-parts-'))
  await Bun.write(
    join(home, 'sandbox.toml'),
    `[features]\n\n[[plugins.replay.sources]]\nid = "replay"\nmodels = ["script"]\nreplies = [[{ type = "text", text = "Hello from the thread" }]]\n`,
  )
  await Bun.write(join(home, 'model.json'), JSON.stringify({ model: 'replay/script' }))
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

test('every stable page part custom CSS can target is on the page, on a desktop and on a phone', async () => {
  const desk = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
  await desk.goto(url)
  await desk.getByRole('button', { name: 'New thread' }).first().click()
  await desk.getByRole('textbox').first().fill('hello')
  await desk.getByRole('button', { name: 'Send' }).click({ timeout: 10_000 })
  await desk.getByText('Hello from the thread').first().waitFor({ timeout: 10_000 })
  await look(desk)
  if (!seen.has('aside')) await desk.getByRole('button', { name: /details/i }).first().click()
  await desk.locator('[data-part="aside"]').first().waitFor({ timeout: 10_000 })
  await look(desk)
  await desk.keyboard.press('Control+k')
  await desk.locator('[data-part="sheet"]').first().waitFor({ timeout: 10_000 })
  await look(desk)
  await desk.keyboard.press('Escape')
  await desk.goto(`${new URL(url).origin}/?view=settings`)
  await desk.locator('[data-part="settings"]').first().waitFor({ timeout: 10_000 })
  await look(desk)
  const settingsPage = desk.url()

  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await desk.context().storageState() })).newPage()
  await phone.goto(settingsPage)
  await phone.locator('[data-part="header"]').first().waitFor({ timeout: 10_000 })
  const onPhone = await visible(phone)

  const missing = Object.keys(pageParts).filter(name => !seen.has(name)) as PagePart[]
  expect(missing).toEqual([])
  expect(onPhone).toEqual(expect.arrayContaining(['app', 'main', 'header']))
}, 90_000)
