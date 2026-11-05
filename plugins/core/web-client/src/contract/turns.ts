import type { Prompt } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { SendMode } from '@sand/turns-contract/contract'

export interface SendOptions {
  label?: string
  settings?: SessionSettings
  mode?: SendMode
}

export interface Turns {
  send(thread: string, prompt: Prompt, options?: SendOptions): Promise<void>
  interrupt(thread: string): Promise<boolean>
  withdraw(thread: string, id: string): Promise<void>
  hold(thread: string, id: string, held: boolean): Promise<void>
}
