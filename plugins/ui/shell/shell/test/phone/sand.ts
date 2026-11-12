import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const main = join(import.meta.dir, '../../../../../../apps/sand/src/main.ts')

const quiet = ['threads', 'bots', 'calendar', 'computers', 'phone', 'notifications', 'updates']

const unloaded = ['features']

const settings = [
  '[features]',
  ...quiet.map(id => `${id} = false`),
  '',
  ...unloaded.map(id => `[plugins.${id}]\nenabled = false\n`),
].join('\n')

const fixture = { name: 'shell-fixture', type: 'module', sand: { web: './index.ts' } }

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

export const startSandbox = async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-phone-'))
  const plugin = join(home, 'plugins', 'shell-fixture')
  mkdirSync(plugin, { recursive: true })
  await Bun.write(join(plugin, 'package.json'), JSON.stringify(fixture))
  await Bun.write(join(plugin, 'index.ts'), Bun.file(join(import.meta.dir, 'fixture.ts')))
  await Bun.write(join(home, 'sandbox.toml'), settings)
  const out = await sand(home, 'sandbox')
  const box = printed(out, /throwaway sand \(pid \d+\) in (.+)$/m)
  return {
    url: printed(out, /open it paired: (\S+)/),
    async stop() {
      await sand(box, 'stop')
      rmSync(box, { recursive: true, force: true })
      rmSync(home, { recursive: true, force: true })
    },
  }
}
