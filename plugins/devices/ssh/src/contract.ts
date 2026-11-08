import { event, service } from 'drydock'

export interface SshHost {
  id: string
  name: string
  target: string
}

export interface SshPrompt {
  text: string
  secret: boolean
}

export interface SshConnectOptions {
  progress?: (text: string) => void
  ask?: (prompt: SshPrompt) => Promise<string | null>
  signal?: AbortSignal
}

export interface SshMachines {
  hosts(): SshHost[]
  connect(host: string, options?: SshConnectOptions): Promise<string>
}

export const sshMachines = service<SshMachines>('sshMachines')

export const sshHostsChange = event<() => void>('sshMachines.change')
