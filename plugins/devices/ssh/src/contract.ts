import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface SshHost {
  id: string
  name: string
  target: string
}

export interface SshPrompt {
  text: string
  secret: boolean
  confirm?: boolean
}

export interface SshConnectOptions {
  progress?: (text: string) => void
  ask?: (prompt: SshPrompt) => Promise<string | null>
  signal?: AbortSignal
}

export type SshLinkState = 'connected' | 'connecting' | 'needs-you' | 'failed'

export interface SshMachine {
  pc: string
  name: string
  target: string
  state: SshLinkState
  error?: string
}

export interface SshMachines {
  hosts(): SshHost[]
  machines(): SshMachine[]
  connect(host: string, options?: SshConnectOptions): Promise<string>
  reconnect(pc: string, options?: SshConnectOptions): Promise<void>
}

export const sshMachines = service<SshMachines>('sshMachines')

export const sshHostsChange = event<() => void>('sshMachines.change')

export interface SshState {
  hosts: SshHost[]
  machines: SshMachine[]
}

export interface SshProgress {
  attempt: string
  text: string
}

export interface SshAsk extends SshPrompt {
  attempt: string
  id: string
}

const attempt = z.string().min(1).max(100)

export const sshState = request('ssh.state', { input: z.object({}), output: type<SshState>() })

export const sshConnect = request('ssh.connect', {
  input: z.object({ host: z.string().trim().min(1).max(500), attempt }),
  output: type<{ pc: string }>(),
})

export const sshReconnect = request('ssh.reconnect', { input: z.object({ pc: z.string().min(1), attempt }), output: type<void>() })

export const sshAnswer = request('ssh.answer', {
  input: z.object({ attempt, id: z.string().min(1), value: z.string().max(4000).nullable() }),
  output: type<void>(),
})

export const sshCancel = request('ssh.cancel', { input: z.object({ attempt }), output: type<void>() })

export const sshStateChange = wireEvent<SshState>('ssh.state')

export const sshProgress = wireEvent<SshProgress>('ssh.progress')

export const sshAsk = wireEvent<SshAsk>('ssh.ask')
