import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Seeded } from './seed'

const main = join(import.meta.dir, '../../sand/src/main.ts')

const addons = ['git', 'terminal', 'calendar', 'connections', 'logins', 'computers', 'bot-watches', 'logbook', 'guesses', 'stash', 'math', 'mcp', 'outside']

export const replyText = (index: number) => `Bench reply ${index} arrived.`

const settings = (replies: number) =>
  [
    '[features]',
    ...addons.map(id => `${id} = true`),
    '',
    '[[plugins.replay.sources]]',
    'id = "replay"',
    'models = ["script"]',
    `replies = [${Array.from({ length: replies }, (_, index) => `[{ type = "text", text = "${replyText(index + 1)}" }]`).join(', ')}]`,
    '',
  ].join('\n')

const sand = async (home: string, ...args: string[]) => {
  const run = Bun.spawn([process.execPath, main, '--home', home, ...args], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, BROWSER: 'none' } })
  const [out, err, code] = await Promise.all([new Response(run.stdout).text(), new Response(run.stderr).text(), run.exited])
  if (code !== 0) throw new Error(`sand ${args.join(' ')} failed: ${err || out}`)
  return out
}

const printed = (out: string, pattern: RegExp) => {
  const found = out.match(pattern)?.[1]?.trim()
  if (!found) throw new Error(`sand printed no ${pattern}:\n${out}`)
  return found
}

const seededIn = async (box: string): Promise<Seeded> => {
  for (let waited = 0; waited < 600; waited++) {
    const file = Bun.file(join(box, 'bench-seed.json'))
    if (await file.exists()) {
      const seeded = await file.json().catch(() => undefined)
      if (seeded) return seeded
    }
    await Bun.sleep(1000)
  }
  throw new Error(`the seed plugin wrote nothing in ${box}`)
}

export interface Sandbox {
  box: string
  pairUrl: string
  seeded: Seeded
  stop(): Promise<void>
}

const seedBox = async (replies: number) => {
  const home = mkdtempSync(join(tmpdir(), 'sand-bench-'))
  const plugin = join(home, 'plugins', 'bench-seed')
  mkdirSync(plugin, { recursive: true })
  cpSync(join(import.meta.dir, 'seed'), plugin, { recursive: true })
  await Bun.write(join(plugin, 'package.json'), JSON.stringify({ name: 'bench-seed', type: 'module', sand: { runtime: './index.ts' } }))
  await Bun.write(join(home, 'sandbox.toml'), settings(replies))
  await Bun.write(join(home, 'model.json'), JSON.stringify({ model: 'replay/script' }))
  const out = await sand(home, 'sandbox')
  rmSync(home, { recursive: true, force: true })
  return printed(out, /throwaway sand \(pid \d+\) in (.+)$/m)
}

export const startSandbox = async (replies: number, kept?: string, keep = false): Promise<Sandbox> => {
  const box = kept ?? (await seedBox(replies))
  const seeded = await seededIn(box)
  await sand(box, 'stop').catch(() => {})
  const served = await sand(box, 'serve')
  return {
    box,
    pairUrl: printed(served, /open it paired: (\S+)/),
    seeded,
    async stop() {
      await sand(box, 'stop')
      if (!kept && !keep) rmSync(box, { recursive: true, force: true })
    },
  }
}
