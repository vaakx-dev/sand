import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Seeded } from './seed/chat'

export interface Script {
  replies: number
  gapMs: number
}

export interface Plan {
  script: Script
  plugin: 'index.ts' | 'bulk.ts'
  addons?: string[]
}

export interface Served {
  pairUrl: string
  pid: number
}

export interface Sandbox {
  box: string
  pairUrl: string
  seeded: Seeded
  pairAgain(): Promise<string>
  stop(): Promise<void>
}

export interface SandboxOptions {
  replies: number
  sand?: Sand
  box?: string
  keep?: boolean
}

const REPO = join(import.meta.dir, '../../..')

const ADDONS = ['git', 'terminal', 'calendar', 'connections', 'logins', 'computers', 'bot-watches', 'logbook', 'guesses', 'stash', 'math', 'mcp', 'outside']

const STREAM_GAP_MS = 600

const SEED_WAIT_SECS = 600

const streamed = (index: number, gapMs: number) =>
  [`Bench reply ${index} starts. `, 'It keeps going for a while, ', 'the way a model writes its first paragraph.\n\n', `A second paragraph ends reply ${index}.`]
    .map(text => `{ type = "text", text = ${JSON.stringify(text)} }`)
    .join(`, { type = "wait", ms = ${gapMs} }, `)

const settings = ({ replies, gapMs }: Script, addons: string[]) =>
  [
    '[features]',
    ...[...ADDONS, ...addons].map(id => `${id} = true`),
    '',
    '[[plugins.replay.sources]]',
    'id = "replay"',
    'models = ["script"]',
    `replies = [${Array.from({ length: replies }, (_, index) => `[${streamed(index + 1, gapMs)}]`).join(', ')}]`,
    '',
    '[plugins.model.levels.main]',
    'model = "replay/script"',
    '',
  ].join('\n')

const printed = (out: string, pattern: RegExp) => {
  const found = out.match(pattern)?.[1]?.trim()
  if (!found) throw new Error(`sand printed no ${pattern}:\n${out}`)
  return found
}

const seededIn = async (box: string): Promise<Seeded> => {
  for (let waited = 0; waited < SEED_WAIT_SECS; waited++) {
    const file = Bun.file(join(box, 'bench-seed.json'))
    if (await file.exists()) {
      const seeded = await file.json().catch(() => undefined)
      if (seeded) return seeded
    }
    await Bun.sleep(1000)
  }
  throw new Error(`the seed plugin wrote nothing in ${box}`)
}

class Sand {
  readonly #main: string
  readonly #seed: string

  constructor(root = REPO) {
    this.#main = join(root, 'apps/sand/src/main.ts')
    this.#seed = join(root, 'apps/bench/src/seed')
  }

  async run(home: string, ...args: string[]) {
    const run = Bun.spawn([process.execPath, this.#main, '--home', home, ...args], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, BROWSER: 'none' } })
    const [out, err, code] = await Promise.all([new Response(run.stdout).text(), new Response(run.stderr).text(), run.exited])
    if (code !== 0) throw new Error(`sand ${args.join(' ')} failed: ${err || out}`)
    return out
  }

  async #sandbox({ script, plugin, addons = [] }: Plan) {
    const home = mkdtempSync(join(tmpdir(), 'sand-bench-'))
    const folder = join(home, 'plugins', 'bench-seed')
    mkdirSync(folder, { recursive: true })
    cpSync(this.#seed, folder, { recursive: true })
    cpSync(join(REPO, 'docs/images/phone-chat.png'), join(folder, 'plot.png'))
    await Bun.write(join(folder, 'package.json'), JSON.stringify({ name: 'bench-seed', type: 'module', sand: { runtime: `./${plugin}` } }))
    await Bun.write(join(home, 'sandbox.toml'), settings(script, addons))
    const out = await this.run(home, 'sandbox')
    rmSync(home, { recursive: true, force: true })
    return printed(out, /throwaway sand \(pid \d+\) in (.+)$/m).replace(/^~(?=[\\/])/, homedir())
  }

  async seed(plan: Plan) {
    const box = await this.#sandbox(plan)
    const seeded = await seededIn(box)
    await this.stop(box)
    return { box, seeded }
  }

  async serve(box: string): Promise<Served> {
    const out = await this.run(box, 'serve')
    return { pairUrl: printed(out, /open it paired: (\S+)/), pid: Number(printed(out, /started sand \(pid (\d+)\)/)) }
  }

  async stop(box: string) {
    await this.run(box, 'stop').catch(() => {})
  }
}

const startSandbox = async ({ replies, sand = new Sand(), box: kept, keep = false }: SandboxOptions): Promise<Sandbox> => {
  const { box, seeded } = kept ? { box: kept, seeded: await seededIn(kept) } : await sand.seed({ script: { replies, gapMs: STREAM_GAP_MS }, plugin: 'index.ts' })
  await sand.stop(box)
  const served = await sand.serve(box)
  return {
    box,
    pairUrl: served.pairUrl,
    seeded,
    pairAgain: async () => printed(await sand.run(box, 'serve'), /open it paired: (\S+)/),
    async stop() {
      await sand.stop(box)
      if (!kept && !keep) rmSync(box, { recursive: true, force: true })
    },
  }
}

export { Sand, startSandbox }
