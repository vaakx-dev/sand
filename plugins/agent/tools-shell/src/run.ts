import type { Subprocess } from 'bun'

const windows = process.platform === 'win32'
const drainGrace = 500
const taskkillWait = 5000

export interface RunOptions {
  cwd: string
  signal: AbortSignal
  timeout: number
  verbatim?: boolean
  env?: Record<string, string>
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

const lines = (text: string) => (windows ? text.replaceAll('\r\n', '\n') : text)

const taskkill = async (pid: number) => {
  const killer = Bun.spawn(['taskkill', '/pid', String(pid), '/T', '/F'], { stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true })
  const code = await Promise.race([killer.exited, Bun.sleep(taskkillWait).then(() => -1)])
  return code === 0
}

const killTree = async (child: Subprocess) => {
  if (windows) {
    if (!(await taskkill(child.pid))) child.kill('SIGKILL')
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

export const run = async (argv: string[], { cwd, signal, timeout, verbatim = false, env = {} }: RunOptions) => {
  const child = Bun.spawn(argv, {
    cwd,
    env: { ...process.env, ...env },
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    detached: !windows,
    windowsHide: true,
    windowsVerbatimArguments: verbatim,
  })
  const stdout = collect(child.stdout)
  const stderr = collect(child.stderr)
  let timedOut = false
  const abort = () => void killTree(child)
  const timer = setTimeout(() => {
    timedOut = true
    void killTree(child)
  }, timeout)
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()

  const code = await child.exited
  clearTimeout(timer)
  signal.removeEventListener('abort', abort)

  await Promise.race([Promise.all([stdout.done, stderr.done]), Bun.sleep(drainGrace)])
  await Promise.all([stdout.stop(), stderr.stop()])
  return { code, timedOut, stdout: lines(stdout.text()), stderr: lines(stderr.text()) }
}
