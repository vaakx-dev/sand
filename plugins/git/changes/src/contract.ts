import type { DiffFile, DiffPatch } from '@sand/git-diff/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export type ChangeState = 'none' | 'ready' | 'merging' | 'merged' | 'conflict' | 'failed'

export interface ThreadChanges {
  session: string
  project: string | null
  state: ChangeState
  reason?: string
  files: DiffFile[]
  add: number
  del: number
  commit?: string
}

const callers = 'any'
const place = 'thread'

export const changesList = request('changes.list', {
  input: z.object({ sessions: z.array(z.string()).optional(), project: z.string().optional() }),
  output: type<ThreadChanges[]>(),
  callers,
  place,
})

export const changesPatch = request('changes.patch', {
  input: z.object({ session: z.string(), path: z.string(), from: z.string().optional() }),
  output: type<DiffPatch>(),
  callers,
  place,
})

export const changesMerge = request('changes.merge', {
  input: z.object({ session: z.string().optional() }),
  output: type<ThreadChanges>(),
  callers,
  place,
})

export const changesChange = wireEvent<ThreadChanges>('changes.change')

export interface ChangesLive {
  get(session: string, device?: string): ThreadChanges | undefined
}

export const changesLive = service<ChangesLive>('changesLive')
