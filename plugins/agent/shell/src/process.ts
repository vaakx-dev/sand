import type { Subprocess } from 'bun'
import type { TrackedJob } from '@sand/processes/contract'
import type { Dispose } from 'drydock'
import { jobObject } from './job-object'

const windows = process.platform === 'win32'
const taskkillWait = 5000
const drainGrace = 500

const noPrompts = { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_EDITOR: 'true', GIT_PAGER: 'cat', PAGER: 'cat' }

export const agentEnv = { CI: '1' }

export interface SpawnOptions {
  cwd: string
  verbatim?: boolean
  env?: Record<string, string>
  killOnClose?: boolean
  track?: Track
}

export type Track = (pid: number, job?: TrackedJob) => Dispose | undefined

const taskkill = async (pid: number) => {
  const killer = Bun.spawn(['taskkill', '/pid', String(pid), '/T', '/F'], { stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true })
  const code = await Promise.race([killer.exited, Bun.sleep(taskkillWait).then(() => -1)])
  return code === 0
}

const windowsTree = (child: Subprocess, job: ReturnType<typeof jobObject>) => async () => {
  if (job) return void job.kill()
  if (!(await taskkill(child.pid))) child.kill('SIGKILL')
}

const orphanGuard = (group: number) => {
  const guard = Bun.spawn(['sh', '-c', `read line; kill -KILL -${group}`], { stdio: ['pipe', 'ignore', 'ignore'], detached: true })
  guard.unref()
  return guard
}

const groupTree = (child: Subprocess, killOnClose: boolean) => {
  const guard = killOnClose ? orphanGuard(child.pid) : undefined
  return async () => {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch {
      child.kill('SIGKILL')
    }
    guard?.kill('SIGKILL')
  }
}

export const spawn = <In extends 'pipe' | 'ignore'>(argv: string[], stdin: In, { cwd, verbatim = false, env = {}, killOnClose = false, track }: SpawnOptions) => {
  const child = Bun.spawn(argv, {
    cwd,
    env: { ...process.env, ...noPrompts, ...env },
    stdin,
    stdout: 'pipe',
    stderr: 'pipe',
    detached: !windows,
    windowsHide: true,
    windowsVerbatimArguments: verbatim,
  })
  const job = windows ? jobObject(child.pid, killOnClose) : undefined
  const untrack = track?.(child.pid, job)
  void child.exited.then(() => (untrack ? untrack() : job?.close()))
  return { child, killTree: windows ? windowsTree(child, job) : groupTree(child, killOnClose) }
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
