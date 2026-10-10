import { join } from 'node:path'

const tailBytes = 64 * 1024
const tailLines = 40
const maxLine = 400
const ansi = /\x1b\[[0-9;?]*[A-Za-z]/g

export const serverLogTail = async (home: string): Promise<string[]> => {
  try {
    const source = Bun.file(join(home, 'server.log'))
    const start = Math.max(0, source.size - tailBytes)
    const lines = (await source.slice(start).text()).split(/\r?\n/)
    if (start > 0) lines.shift()
    while (lines.length && !lines.at(-1)) lines.pop()
    return lines.slice(-tailLines).map(line => line.replace(ansi, '').slice(0, maxLine))
  } catch {
    return []
  }
}
