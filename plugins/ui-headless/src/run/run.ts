import type { TurnResult } from '@sand/protocol'
import type { Follower } from '../follow/follower'
import type { Printer } from '../print/printer'
import type { HeadlessUI } from '../ui/service'

export interface Run {
  printer: Printer
  ui: HeadlessUI
  prompt: string
  signal: AbortSignal
}

export const exitCode = (result: TurnResult, signal: AbortSignal) => {
  if (signal.aborted) return 130
  return result.stopReason === 'refusal' ? 1 : 0
}

export const commandExit = async (follower: Follower, signal: AbortSignal, code: number) => {
  if (follower.turned()) await follower.finish(signal)
  if (signal.aborted) return 130
  return follower.ended()?.stopReason === 'refusal' ? 1 : code
}

export const whenAborted = (signal: AbortSignal, stop: () => void) => {
  if (signal.aborted) stop()
  else signal.addEventListener('abort', stop, { once: true })
}
