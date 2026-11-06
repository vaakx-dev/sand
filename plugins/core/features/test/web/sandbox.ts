import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const main = join(import.meta.dir, '../../../../../apps/sand/src/main.ts')

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

export const startSandbox = async (settings: string) => {
  const home = mkdtempSync(join(tmpdir(), 'sand-features-'))
  await Bun.write(join(home, 'sandbox.toml'), settings)
  const out = await sand(home, 'sandbox')
  rmSync(home, { recursive: true, force: true })
  const box = printed(out, /throwaway sand \(pid \d+\) in (.+)$/m)
  return {
    url: printed(out, /open it paired: (\S+)/),
    log: () => Bun.file(join(box, 'server.log')).text(),
    async stop() {
      await sand(box, 'stop')
      rmSync(box, { recursive: true, force: true })
    },
  }
}
