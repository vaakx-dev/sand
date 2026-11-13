import type { ConversationRef } from '@sand/engine/contract'
import type { Ledger } from '@sand/ledger/contract'
import type { Database } from 'bun:sqlite'
import type { Mode, ModeEntry } from '../contract'
import { createDecisions } from './decisions'
import { createRules } from './rules'
import { schema } from './schema'

const DEFAULT_DEADLINE_MINUTES = 30

const createModes = (db: Database) => {
  const one = db.query<{ mode: Mode }, ConversationRef>('select mode from permission_modes where owner = $owner and conversation = $id')
  const all = db.query<ModeEntry, []>('select owner, conversation as id, mode from permission_modes order by at')
  const written = db.query(
    'insert into permission_modes (owner, conversation, mode, at) values ($owner, $id, $mode, $at) on conflict (owner, conversation) do update set mode = $mode, at = $at',
  )
  return {
    get: ({ owner, id }: ConversationRef) => one.get({ owner, id })?.mode,
    list: () => all.all(),
    set: ({ owner, id }: ConversationRef, mode: Mode) => void written.run({ owner, id, mode, at: Date.now() }),
  }
}

const createSettings = (db: Database) => {
  const read = db.query<{ value: string }, { name: string }>('select value from permission_settings where name = $name')
  const write = db.query('insert into permission_settings (name, value) values ($name, $value) on conflict (name) do update set value = $value')
  return {
    deadlineMinutes: () => Number(read.get({ name: 'deadline' })?.value ?? DEFAULT_DEADLINE_MINUTES),
    setDeadlineMinutes: (minutes: number) => void write.run({ name: 'deadline', value: String(minutes) }),
  }
}

export const openStores = (ledger: Ledger) => {
  ledger.migrate('permissions', schema)
  const { db } = ledger
  return { rules: createRules(db), decisions: createDecisions(db), modes: createModes(db), settings: createSettings(db) }
}

export type Stores = ReturnType<typeof openStores>
