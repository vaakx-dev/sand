import { expect, test } from 'bun:test'
import { join } from 'node:path'

const EXIT_WAIT_MS = 5_000

const startPath = JSON.stringify(join(import.meta.dir, '..', 'src', 'start.ts'))

const sandWithBackgroundCommand = `
  const { start } = await import(${startPath})
  start(['sh', '-c', 'echo group $$; sleep 300 & sleep 300; wait'], text => process.stdout.write(text), { cwd: process.cwd() })
  setInterval(() => {}, 1000)
`

const groupAlive = (group: number) => {
  try {
    process.kill(-group, 0)
    return true
  } catch {
    return false
  }
}

const groupExited = async (group: number) => {
  const deadline = Date.now() + EXIT_WAIT_MS
  while (groupAlive(group) && Date.now() < deadline) await Bun.sleep(50)
  return !groupAlive(group)
}

const firstLine = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader()
  const { value } = await reader.read()
  reader.releaseLock()
  return new TextDecoder().decode(value)
}

test.skipIf(process.platform === 'win32')("a background command's process group dies when sand is killed hard", async () => {
  const sand = Bun.spawn([process.execPath, '-e', sandWithBackgroundCommand], { stdout: 'pipe' })
  const group = Number(/group (\d+)/.exec(await firstLine(sand.stdout))?.[1])
  expect(groupAlive(group)).toBe(true)

  sand.kill('SIGKILL')

  expect(await groupExited(group)).toBe(true)
})
