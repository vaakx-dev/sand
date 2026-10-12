import type { Message, ToolCallBlock } from '@sand/messages'
import { isRecord } from '@sand/kit'
import type { Pulse } from '@sand/kit/web'
import { derive } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { secretName } from '../../names'

export interface SecretAsk {
  thread: string
  call: string
  name: string
  reason: string
}

const askOf = (thread: string, call: ToolCallBlock): SecretAsk | undefined => {
  if (!isRecord(call.input) || typeof call.input.name !== 'string') return undefined
  const reason = typeof call.input.reason === 'string' ? call.input.reason : ''
  return { thread, call: call.id, name: call.input.name, reason }
}

const pendingOf = (ctx: Context<'threads'>) => {
  const thread = ctx.threads.current()
  if (!thread?.running) return undefined
  const last = ctx.threads.path(thread.id).findLast(entry => entry.type === 'message')?.data as Message | undefined
  if (last?.role !== 'assistant') return undefined
  const call = last.content.find(
    (block): block is ToolCallBlock => block.type === 'tool_call' && block.name === secretName && !thread.tools.results.has(block.id),
  )
  return call && askOf(thread.id, call)
}

export const pendingSecret = (ctx: Context<'threads'>, changes: Pulse) => {
  const key = changes.read(() => JSON.stringify(pendingOf(ctx) ?? null))
  return derive((): SecretAsk | null => JSON.parse(key.get()))
}
