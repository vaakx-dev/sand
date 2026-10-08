import type { Prompt } from '../message'

export type FollowUpMode = 'queue' | 'steer'

export interface Turns {
  send(thread: string, prompt: Prompt, label?: string, mode?: FollowUpMode): Promise<void>
  interrupt(thread: string): Promise<boolean>
  withdraw(thread: string, id: string): Promise<void>
  edit(thread: string, id: string, prompt: Prompt, label?: string): Promise<void>
  move(thread: string, id: string, index: number): Promise<void>
  promote(thread: string, id: string): Promise<void>
}
