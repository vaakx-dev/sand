import type { Prompt } from '@sand/chats/contract'

export interface Turns {
  send(thread: string, prompt: Prompt, label?: string): Promise<void>
  interrupt(thread: string): Promise<boolean>
  withdraw(thread: string, id: string): Promise<void>
}
