import type { Prompt } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'

export interface OutboxItem {
  id: string
  session: string
  pc: string
  prompt: Prompt
  label: string
  settings?: SessionSettings
  at: number
  error?: string
}

export interface Outbox {
  list(pc: string): OutboxItem[]
  sending(id: string): boolean
  send(id: string): Promise<void>
  cancel(id: string): void
}
