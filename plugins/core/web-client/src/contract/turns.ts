import type { Prompt } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'

export interface Turns {
  send(thread: string, prompt: Prompt, label?: string, settings?: SessionSettings): Promise<void>
  interrupt(thread: string): Promise<boolean>
  withdraw(thread: string, id: string): Promise<void>
}
