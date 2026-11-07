import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const harness = resolve(import.meta.dir, '..', 'src', 'index.ts').replaceAll('\\', '/')

const claude = `import { llmPlans } from '@sand/accounts/contract'
import { definePlugin } from 'drydock'

const plan = {
  id: 'claude',
  label: 'Claude',
  name: 'Claude',
  detail: 'Own sign-in',
  logo: 'anthropic',
  api: 'anthropic',
  signIn: () => Promise.reject(new Error('signed in already')),
  refresh: tokens => Promise.resolve(tokens),
  call: () => { throw new Error('no calls') },
  models: async () => [{ name: 'own', label: 'Own' }],
}

export default definePlugin({
  name: 'claude-code',
  apply(ctx) {
    ctx.watch(llmPlans, plans => plans?.register(plan))
  },
})
`

const codex = `import { definePlugin } from 'drydock'

export default definePlugin({ name: 'codex', apply() {} })
`

const bench = `import { startLiveSand } from '${harness}'

const sand = await startLiveSand(['claude/own'])
await sand.stop()
`

let home: string

const userPlugin = async (name: string, source: string) => {
  const dir = join(home, '.sand', 'plugins', name)
  await Bun.write(join(dir, 'package.json'), JSON.stringify({ name, type: 'module', sand: { runtime: './index.ts' } }))
  await Bun.write(join(dir, 'index.ts'), source)
}

afterEach(() => rmSync(home, { recursive: true, force: true }))

test('a live sand runs the plugins in the sand home in place of built-ins with the same id', async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-user-'))
  await userPlugin('claude-code', claude)
  await userPlugin('codex', codex)
  await Bun.write(join(home, '.sand', 'auth.json'), JSON.stringify({ claude: { type: 'oauth', access: 'own', refresh: 'own', expires: 8e15 } }))
  await Bun.write(join(home, 'bench.ts'), bench)

  const run = Bun.spawn(['bun', join(home, 'bench.ts')], { env: { ...Bun.env, HOME: home, USERPROFILE: home }, stderr: 'pipe' })

  expect([await run.exited, await new Response(run.stderr).text()]).toEqual([0, ''])
}, 30_000)
