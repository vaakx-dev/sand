import type { Ledger } from '@sand/ledger/contract'
import type { Database } from 'bun:sqlite'
import { type Mode, modes } from '../contract'
import { createDecisions } from './decisions'
import { createRules } from './rules'
import { schema } from './schema'

const isMode = (value: string | undefined): value is Mode => modes.some(mode => mode === value)

const createSettings = (db: Database) => {
  const read = db.query<{ value: string }, { name: string }>('select value from approval_settings where name = $name')
  const write = db.query('insert into approval_settings (name, value) values ($name, $value) on conflict (name) do update set value = $value')
  return {
    mode(): Mode {
      const value = read.get({ name: 'mode' })?.value
      return isMode(value) ? value : 'trusted'
    },
    setMode: (mode: Mode) => void write.run({ name: 'mode', value: mode }),
  }
}

export const openStores = (ledger: Ledger) => {
  ledger.migrate('approvals', schema)
  return { rules: createRules(ledger.db), decisions: createDecisions(ledger.db), settings: createSettings(ledger.db) }
}

export type Stores = ReturnType<typeof openStores>
