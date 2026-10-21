import type { Subprocess } from 'bun'
import { jobObject } from './job-object'

const windows = process.platform === 'win32'
const taskkillWait = 5000
const drainGrace = 500

export interface SpawnOptions {
  cwd: string
  verbatim?: boolean
  env?: Record<string, string>
}

const taskkill = async (pid: number) => {
  const killer = Bun.spawn(['taskkill', '/pid', String(pid), '/T', '/F'], { stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true })
  const code = await Promise.race([killer.exited, Bun.sleep(taskkillWait).then(() => -1)])
  return code === 0
}

const windowsTree = (child: Subprocess) => {
  const job = jobObject(child.pid)
  void child.exited.then(() => job?.close())
  return async () => {
    if (job) return void job.kill()
    if (!(await taskkill(child.pid))) child.kill('SIGKILL')
  }
}

const groupTree = (child: Subprocess) => async () => {
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

export const spawn = <In extends 'pipe' | 'ignore'>(argv: string[], stdin: In, { cwd, verbatim = false, env = {} }: SpawnOptions) => {
  const child = Bun.spawn(argv, {
    cwd,
    env: { ...process.env, ...env },
    stdin,
    stdout: 'pipe',
    stderr: 'pipe',
    detached: !windows,
    windowsHide: true,
    windowsVerbatimArguments: verbatim,
  })
  return { child, killTree: windows ? windowsTree(child) : groupTree(child) }
}

export const unixNewlines = (text: string) => (windows ? text.replaceAll('\r\n', '\n') : text)

export const stream = (source: ReadableStream<Uint8Array>, onText: (text: string) => void) => {
  const reader = source.getReader()
  const decoder = new TextDecoder()
  const done = (async () => {
    try {
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        onText(decoder.decode(chunk.value, { stream: true }))
      }
    } catch {}
    onText(decoder.decode())
  })()
  return { done, stop: () => reader.cancel().catch(() => {}) }
}

export type Stream = ReturnType<typeof stream>

export const drain = async (streams: Stream[]) => {
  await Promise.race([Promise.all(streams.map(open => open.done)), Bun.sleep(drainGrace)])
  await Promise.all(streams.map(open => open.stop()))
}
