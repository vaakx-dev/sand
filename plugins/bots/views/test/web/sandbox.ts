import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Page } from 'playwright'

interface Seed {
  imports: string
  inject: string
  body: string
}

const main = join(import.meta.dir, '../../../../../apps/sand/src/main.ts')
const SEED_MARKER = 'seed.json'
const SEED_WAIT_TRIES = 300
const SEED_WAIT_MS = 100

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

const seedPlugin = ({ imports, inject, body }: Seed) => `${imports}
import { paths } from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export default definePlugin({
  name: 'seed',
  inject: { paths, ${inject} },
  apply(ctx) {
    const marker = join(ctx.paths.home, '${SEED_MARKER}')
    if (existsSync(marker)) return
    const seeded = (() => {
${body}
    })()
    writeFileSync(marker, JSON.stringify(seeded))
  },
})
`

const writeSeed = async (home: string, seed: Seed) => {
  const plugin = join(home, 'plugins', 'seed')
  mkdirSync(plugin, { recursive: true })
  await Bun.write(join(plugin, 'index.ts'), seedPlugin(seed))
  await Bun.write(join(plugin, 'package.json'), JSON.stringify({ name: 'seed', type: 'module', sand: { runtime: './index.ts' } }))
}

const seededData = async <T>(box: string): Promise<T> => {
  const marker = Bun.file(join(box, SEED_MARKER))
  for (let tries = 0; tries < SEED_WAIT_TRIES && !(await marker.exists()); tries++) await Bun.sleep(SEED_WAIT_MS)
  return marker.json()
}

export const startSandbox = async <T>(seed: Seed) => {
  const home = mkdtempSync(join(tmpdir(), 'sand-bots-'))
  await writeSeed(home, seed)
  await Bun.write(join(home, 'sandbox.toml'), '[features]\n\n[[plugins.replay.sources]]\nid = "replay"\nmodels = ["script"]\nreplies = []\n')
  const out = await sand(home, 'sandbox')
  rmSync(home, { recursive: true, force: true })
  const box = printed(out, /throwaway sand \(pid \d+\) in (.+)$/m).replace(/^~(?=[\\/])/, homedir())
  return {
    url: printed(out, /open it paired: (\S+)/),
    seeded: await seededData<T>(box),
    async stop() {
      await sand(box, 'stop')
      rmSync(box, { recursive: true, force: true })
    },
  }
}

export const openBot = (page: Page, id: string) =>
  page.evaluate(bot => (window as unknown as { sand: { get(token: { id: string }): { open(route: object): void } } }).sand.get({ id: 'shell' }).open({ kind: 'bot', id: bot }), id)
