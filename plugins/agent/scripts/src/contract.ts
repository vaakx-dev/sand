import type { ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { event } from 'drydock'
import { z } from 'zod'

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

export const scriptUpdate = event<(update: ScriptUpdate) => void>('script.update')

export const scriptUpdateWire = wireEvent<ScriptUpdate>('script.update')

export const helloScripts = helloField<ScriptRun[]>('scripts')

export const scriptStop = request('script.stop', { input: () => z.object({ id: z.string() }), output: type<boolean>() })
