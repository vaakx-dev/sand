import { runtimeEnv, withSafe } from '@sand/util/boot'
import { randomSecret } from '@sand/util/fs'
import type { Subprocess } from 'bun'
import { homedir } from 'node:os'
import type { FailedPlugin, HostMessage, RuntimeActivity, RuntimeMessage, RuntimeState } from './contract'

export interface Child {
  readonly id: string
  readonly pid: number
  readonly secret: string
  readonly proc: Subprocess
  readonly safe: boolean
  url: string
  failed: FailedPlugin[]
  state: RuntimeState
  activity: RuntimeActivity
  drained: boolean
}

export const spawnRuntime = (main: string, safe: boolean, receive: (child: Child, message: RuntimeMessage) => void): Child => {
  const id = Bun.randomUUIDv7()
  const secret = randomSecret(24)
  const proc = Bun.spawn([process.execPath, main, 'runtime'], {
    cwd: homedir(),
    env: withSafe({ ...process.env, [runtimeEnv.id]: id, [runtimeEnv.secret]: secret }, safe),
    stdin: 'ignore',
    stdout: 'inherit',
    stderr: 'inherit',
    serialization: 'json',
    windowsHide: true,
    ipc: message => receive(child, message as RuntimeMessage),
  })
  const child: Child = {
    id,
    pid: proc.pid,
    secret,
    proc,
    safe,
    url: '',
    failed: [],
    state: 'ready',
    activity: { sessions: [] },
    drained: false,
  }
  return child
}

export const sendTo = (child: Child, message: HostMessage) => {
  try {
    child.proc.send(message)
  } catch {}
}
