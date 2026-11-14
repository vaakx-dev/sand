import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Browser } from 'playwright'

const main = join(import.meta.dir, '../../../../../apps/sand/src/main.ts')
const turns = 12
const steps = 30

const seedPlugin = `import { bots } from '@sand/bots/contract'
import { paths } from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export default definePlugin({
  name: 'history-seed',
  inject: { bots, paths },
  apply(ctx) {
    const marker = join(ctx.paths.home, 'history-seed.json')
    if (existsSync(marker)) return
    const bot = ctx.bots.create({ name: 'Worker' })
    const chat = ctx.bots.conversation(bot.id)
    let at = Date.now() - 86_400_000
    for (let turn = 0; turn < ${turns}; turn++) {
      chat.append('message', { role: 'user', content: [{ type: 'text', text: 'Do task ' + turn }] }, { at })
      for (let step = 0; step < ${steps}; step++) {
        const id = 'call-' + turn + '-' + step
        chat.append('message', { role: 'assistant', content: [{ type: 'tool_call', id, name: 'shell', input: { command: 'ls' } }] }, { at: ++at })
        chat.append('message', { role: 'user', content: [{ type: 'tool_result', callId: id, content: [{ type: 'text', text: 'out' }] }] }, { at: ++at })
      }
      chat.append('message', { role: 'assistant', content: [{ type: 'text', text: 'Done task ' + turn }] }, { at: ++at })
      at += 60_000
    }
    writeFileSync(marker, JSON.stringify({ bot: bot.id }))
  },
})
`

const sand = async (home: string, ...args: string[]) => {
  const run = Bun.spawn([process.execPath, main, '--home', home, ...args], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, BROWSER: 'none' } })
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
let bot: string
let browser: Browser

beforeAll(async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-bot-history-'))
  const plugin = join(home, 'plugins', 'history-seed')
  mkdirSync(plugin, { recursive: true })
  await Bun.write(join(plugin, 'index.ts'), seedPlugin)
  await Bun.write(join(plugin, 'package.json'), JSON.stringify({ name: 'history-seed', type: 'module', sand: { runtime: './index.ts' } }))
  await Bun.write(join(home, 'sandbox.toml'), '[features]\n')
  const out = await sand(home, 'sandbox')
  rmSync(home, { recursive: true, force: true })
  box = printed(out, /throwaway sand \(pid \d+\) in (.+)$/m).replace(/^~(?=[\\/])/, homedir())
  url = printed(out, /open it paired: (\S+)/)
  const marker = Bun.file(join(box, 'history-seed.json'))
  for (let tries = 0; tries < 300 && !(await marker.exists()); tries++) await Bun.sleep(100)
  bot = (await marker.json()).bot
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  if (box) {
    await sand(box, 'stop')
    rmSync(box, { recursive: true, force: true })
  }
})

test('a bot chat whose newest page shows one reply loads its whole history as you scroll up', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, serviceWorkers: 'block' })
  const page = await context.newPage()
  await page.goto(url)
  await page.getByRole('button', { name: 'Show the sidebar' }).first().waitFor()
  await page.evaluate(id => (window as unknown as { sand: { get(token: { id: string }): { open(route: object): void } } }).sand.get({ id: 'shell' }).open({ kind: 'bot', id, tab: 'chat' }), bot)
  await page.getByText(`Done task ${turns - 1}`).waitFor()
  const first = page.getByText('Do task 0', { exact: true })
  for (let tries = 0; tries < 100 && !(await first.isVisible()); tries++) {
    await page.evaluate(() => {
      let scroller = [...document.querySelectorAll('p')].find(node => node.textContent?.startsWith('Done task') && node.checkVisibility())?.parentElement
      while (scroller && getComputedStyle(scroller).overflowY !== 'auto') scroller = scroller.parentElement
      if (scroller) scroller.scrollTop -= scroller.clientHeight
    })
    await Bun.sleep(150)
  }
  expect(await first.isVisible()).toBe(true)
  await context.close()
}, 60_000)
