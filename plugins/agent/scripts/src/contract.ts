import type { ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import { helloField, wireEvent } from '@sand/host-hub/contract'
import { event } from 'drydock'

export type ScriptStatus = 'running' | 'done' | 'failed' | 'stopped'

export interface ScriptCall {
  call: ToolCallBlock
  result?: ToolResultBlock
}

export interface ScriptHead {
  id: string
  thread: string
  title: string
  code: string
  status: ScriptStatus
  started: number
  ended?: number
}

export interface ScriptRun extends ScriptHead {
  calls: ScriptCall[]
}

export interface ScriptUpdate {
  head: ScriptHead
  call?: ScriptCall
}

export const scriptEntry = 'script'

export const scriptCalls = (entry: { type: string; data: unknown }): ScriptCall[] => (entry.type === scriptEntry ? (entry.data as ScriptRun).calls : [])

export const scriptUpdate = event<(update: ScriptUpdate) => void>('script.update')

export const scriptUpdateWire = wireEvent<ScriptUpdate>('script.update')

export const helloScripts = helloField<ScriptRun[]>('scripts')

