import type { Prompt } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { SendMode } from '@sand/turns-contract/contract'

export interface OutboxItem {
  id: string
  session: string
  pc: string
  prompt: Prompt
  mode?: SendMode
  label: string
  settings?: SessionSettings
  at: number
  error?: string
}

export interface Outbox {
  accepts(pc: string): boolean
  list(pc: string): OutboxItem[]
  sending(id: string): boolean
  send(id: string): Promise<void>
  cancel(id: string): void
}
