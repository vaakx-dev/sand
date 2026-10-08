import type { Subprocess } from 'bun'

const windows = process.platform === 'win32'
const drainGrace = 500

export interface RunOptions {
  cwd: string
  signal: AbortSignal
  timeout: number
}

const collect = (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ''
  const done = (async () => {
    try {
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        text += decoder.decode(chunk.value, { stream: true })
      }
    } catch {}
  })()
  return {
    done,
    stop: () => reader.cancel().catch(() => {}),
    text: () => text + decoder.decode(),
  }
}

const killTree = (child: Subprocess) => {
  if (windows) {
    Bun.spawn(['taskkill', '/pid', String(child.pid), '/T', '/F'], { stdio: ['ignore', 'ignore', 'ignore'] })
    child.kill('SIGKILL')
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

export const run = async (argv: string[], { cwd, signal, timeout }: RunOptions) => {
  const child = Bun.spawn(argv, { cwd, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', detached: !windows })
  const stdout = collect(child.stdout)
  const stderr = collect(child.stderr)
  let timedOut = false
  const abort = () => killTree(child)
  const timer = setTimeout(() => {
    timedOut = true
    killTree(child)
  }, timeout)
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()

  const code = await child.exited
  clearTimeout(timer)
  signal.removeEventListener('abort', abort)

  await Promise.race([Promise.all([stdout.done, stderr.done]), Bun.sleep(drainGrace)])
  await Promise.all([stdout.stop(), stderr.stop()])
  return { code, timedOut, stdout: stdout.text(), stderr: stderr.text() }
}
