import { join } from 'node:path'

const tailBytes = 64 * 1024
const maxLine = 400
const ansi = /\x1b\[[0-9;?]*[A-Za-z]/g

export const serverLog = (home: string) => join(home, 'server.log')

export const logTail = async (file: string, count = 40): Promise<string[]> => {
  try {
    const source = Bun.file(file)
    const start = Math.max(0, source.size - tailBytes)
    const lines = (await source.slice(start).text()).split(/\r?\n/)
    if (start > 0) lines.shift()
    while (lines.length && !lines.at(-1)) lines.pop()
    return lines.slice(-count).map(line => line.replace(ansi, '').slice(0, maxLine))
  } catch {
    return []
  }
}
