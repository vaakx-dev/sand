import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Page } from 'playwright'

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

export type Reply = { text: string | string[]; hold?: boolean }

const CHUNK_GAP_MS = 300

const textToml = (text: string) => `{ type = "text", text = ${JSON.stringify(text)} }`

const replyToml = ({ text, hold }: Reply) => {
  const chunks = [text].flat().map(textToml).join(`, { type = "wait", ms = ${CHUNK_GAP_MS} }, `)
  return `[${chunks}${hold ? ', { type = "hold" }' : ''}]`
}

export const startSandbox = async (replies: Reply[]) => {
  const home = mkdtempSync(join(tmpdir(), 'sand-chat-'))
  await Bun.write(
    join(home, 'sandbox.toml'),
    `[features]\n\n[[plugins.replay.sources]]\nid = "replay"\nmodels = ["script"]\nreplies = [${replies.map(replyToml).join(', ')}]\n\n[plugins.thread-titles]\nenabled = false\n`,
  )
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

export const newChat = async (page: Page) => {
  await page.getByRole('button', { name: 'New thread' }).first().click()
  await page.getByRole('textbox').first().waitFor()
}
