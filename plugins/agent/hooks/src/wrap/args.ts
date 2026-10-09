import type { Session } from '@sand/sessions-sqlite/contract'
import type { HookName } from '../contract'

export type HookKind = 'change' | 'decide' | 'tell'

interface HookSpec {
  kind: HookKind
  session: number
  timeout: number
}

const spec = (kind: HookKind, session: number, timeout = 2000): HookSpec => ({ kind, session, timeout })

export const hookSpecs: Record<HookName, HookSpec> = {
  'turn.prompt': spec('change', 1),
  'turn.start': spec('tell', 0),
  'model.choose': spec('decide', 0, 5000),
  'context.build': spec('change', 1),
  'llm.response': spec('change', 1),
  'tool.before': spec('decide', 1, 5000),
  'tool.result': spec('change', 2),
  'turn.stop': spec('decide', 0),
  'context.overflow': spec('decide', 0),
  'turn.end': spec('tell', 0),
}

export const hookNames = Object.keys(hookSpecs) as HookName[]

export const isHookName = (name: string): name is HookName => name in hookSpecs

export const sessionArg = (name: HookName, args: unknown[]) => args[hookSpecs[name].session] as Session | undefined

export const timeoutOf = (name: HookName, timeout?: number) => Math.min(Math.max(timeout ?? hookSpecs[name].timeout, 1), 30000)
