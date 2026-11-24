import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

const settings = (title: string, html: string) =>
  [
    '[features]',
    '',
    '[[plugins.replay.sources]]',
    'id = "replay"',
    'models = ["script"]',
    `replies = [[{ type = "call", name = "html_render", input = { title = ${JSON.stringify(title)}, html = ${JSON.stringify(html)} } }], [{ type = "text", text = "Here it is" }]]`,
    '',
    '[plugins.thread-titles]',
    'enabled = false',
    '',
  ].join('\n')

export const startSandbox = async (title: string, html: string) => {
  const home = mkdtempSync(join(tmpdir(), 'sand-html-'))
  await Bun.write(join(home, 'sandbox.toml'), settings(title, html))
  const out = await sand(home, 'sandbox')
  rmSync(home, { recursive: true, force: true })
  const box = printed(out, /throwaway sand \(pid \d+\) in (.+)$/m)
  return {
    url: printed(out, /open it paired: (\S+)/),
    async stop() {
      await sand(box, 'stop')
      rmSync(box, { recursive: true, force: true })
    },
  }
}
