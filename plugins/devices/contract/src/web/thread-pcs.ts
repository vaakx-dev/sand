import { service } from 'drydock'

export interface ThreadPcs {
  ofSession(session: string): string | undefined
  current(): string | undefined
  since(pc: string): string | undefined
}

export const threadPcs = service<ThreadPcs>('threadPcs')
