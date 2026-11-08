import { afterAll, beforeAll, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Browser } from 'playwright'

const main = join(import.meta.dir, '../../../../../apps/sand/src/main.ts')

const stuckPlugin = `import { helloField } from '@sand/host-hub/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'stuck',
  apply(ctx) {
    ctx.watch(server, found => {
      if (!found) return
      const slow = found.hello(helloField('stuck.slow'), () => new Promise(() => {}))
      const broken = found.hello(helloField('stuck.broken'), () => {
        throw new Error('broken on purpose')
      })
      return () => {
        slow()
        broken()
      }
    })
  },
})
`

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

beforeAll(async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-hello-'))
  await Bun.write(
    join(home, 'sandbox.toml'),
    `[features]\n\n[[plugins.replay.sources]]\nid = "replay"\nmodels = ["script"]\nreplies = [[{ type = "text", text = "Hello from the thread" }]]\n`,
  )
  await Bun.write(join(home, 'model.json'), JSON.stringify({ model: 'replay/script' }))
  mkdirSync(join(home, 'plugins', 'stuck'), { recursive: true })
  await Bun.write(join(home, 'plugins', 'stuck', 'package.json'), JSON.stringify({ name: 'stuck', type: 'module', sand: { runtime: './index.js' } }))
  await Bun.write(join(home, 'plugins', 'stuck', 'index.js'), stuckPlugin)
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

test('the page works while a plugin never answers its part of the hello, or throws', async () => {
  const page = await browser.newPage()
  await page.goto(url)
  await page.getByRole('button', { name: 'New chat' }).first().click()
  await page.getByRole('dialog', { name: 'Search' }).getByText('No project', { exact: true }).click()
  await page.waitForURL(/view=draft/)
  await page.getByRole('textbox').first().waitFor()
  await page.getByRole('textbox').first().fill('hello')
  await page.getByRole('button', { name: 'Send' }).click({ timeout: 10_000 })
  await page.getByText('Hello from the thread').first().waitFor({ timeout: 10_000 })
  await page.close()
}, 60_000)
