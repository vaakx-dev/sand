import { type InputOf, request, type, wireEvent } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

export type SnapshotSide = 'before' | 'after'

export interface TurnSnapshot {
  session: string
  turn: string
  index: number
  at: number
  cwd: string
  before: string
  after?: string
  files: number
  add: number
  del: number
  restored?: { turn: string; to: SnapshotSide }
}

export interface ListedTurn extends TurnSnapshot {
  number?: number
}

export interface TurnSnapshots {
  session: string
  turns: ListedTurn[]
}

const session = z.string()

export const snapshotsList = request('snapshots.list', { input: z.object({ session }), output: type<TurnSnapshots>(), place: 'thread' })
export const snapshotsRestore = request('snapshots.restore', {
  input: z.object({ session, turn: z.string(), to: z.enum(['before', 'after']) }),
  output: type<TurnSnapshots>(),
  place: 'thread',
})

export const snapshotsChange = wireEvent<TurnSnapshots>('snapshots.change')

export interface SnapshotsClient {
  list(input: InputOf<typeof snapshotsList>): Promise<TurnSnapshots>
  restore(input: InputOf<typeof snapshotsRestore>): Promise<TurnSnapshots>
  onChange(listener: (snapshots: TurnSnapshots, device: string) => void): Dispose
}

export const snapshotsClient = service<SnapshotsClient>('snapshotsClient')
