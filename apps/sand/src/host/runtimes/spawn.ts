import type { FailedPlugin, HostMessage, RuntimeActivity, RuntimeMessage, RuntimeState } from '@sand/protocol'
import type { Subprocess } from 'bun'
import { homedir } from 'node:os'
import { newSecret, runtimeEnv } from '../../runtime/channel'

export interface Child {
  readonly id: string
  readonly pid: number
  readonly secret: string
  readonly proc: Subprocess
  url: string
  failed: FailedPlugin[]
  state: RuntimeState
  activity: RuntimeActivity
  drained: boolean
}

export const spawnRuntime = (main: string, receive: (child: Child, message: RuntimeMessage) => void): Child => {
  const id = Bun.randomUUIDv7()
  const secret = newSecret()
  const proc = Bun.spawn([process.execPath, main, 'runtime'], {
    cwd: homedir(),
    env: { ...process.env, [runtimeEnv.id]: id, [runtimeEnv.secret]: secret },
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
    url: '',
    failed: [],
    state: 'ready',
    activity: { sessions: [], jobs: [] },
    drained: false,
  }
  return child
}

export const sendTo = (child: Child, message: HostMessage) => {
  try {
    child.proc.send(message)
  } catch {}
}
