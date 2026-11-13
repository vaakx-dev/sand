import { type Dispose, service } from 'drydock'

export interface ChatMemory {
  conversation: string
  bytes: number
  pids: number[]
}

export interface Processes {
  track(conversation: string, pid: number): Dispose
  chats(): Promise<ChatMemory[]>
}

export const processes = service<Processes>('processes')
