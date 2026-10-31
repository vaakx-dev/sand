import type { GitLines, GitOptions } from '../contract'
import { limited } from './limit'
import { startGit } from './spawn'

const firstLines = async (stream: ReadableStream<Uint8Array>, max: number) => {
  const lines: string[] = []
  const decoder = new TextDecoder()
  let rest = ''
  for await (const chunk of stream) {
    const parts = (rest + decoder.decode(chunk, { stream: true })).split('\n')
    rest = parts.pop() ?? ''
    lines.push(...parts.map(line => line.replace(/\r$/, '')))
    if (lines.length >= max) return { lines: lines.slice(0, max), full: true }
  }
  if (rest) lines.push(rest.replace(/\r$/, ''))
  return { lines: lines.slice(0, max), full: false }
}

export const gitLines = (cwd: string, args: string[], max: number, options: GitOptions = {}): Promise<GitLines> =>
  limited(options.timeoutMs, async () => {
    const child = startGit(cwd, args, options)
    const draining = new Response(child.stderr).text()
    const { lines, full } = await firstLines(child.stdout, max)
    if (full) child.kill()
    const [code] = await Promise.all([child.exited, draining])
    return { code: full ? 0 : code, lines }
  })
