import type { Ledger } from '@sand/ledger/contract'
import type { Schedule } from './contract'

type Row = { id: string; body: string; state: string | null }

export const schema = [
  [
    `create table schedules (
      id text primary key,
      body text not null,
      state text
    )`,
  ],
]

export interface Stored {
  schedule: Schedule
  state: unknown
}

const storedOf = (row: Row): Stored => ({ schedule: JSON.parse(row.body), state: row.state === null ? undefined : JSON.parse(row.state) })

export const openStore = ({ db, migrate }: Ledger) => {
  migrate('schedules', schema)
  const all = db.query<Row, []>('select * from schedules')
  const save = db.query<unknown, Row>('insert or replace into schedules (id, body, state) values ($id, $body, $state)')
  const remove = db.query<unknown, { id: string }>('delete from schedules where id = $id')
  return {
    load: () => all.all().map(storedOf),
    save: ({ schedule, state }: Stored) => void save.run({ id: schedule.id, body: JSON.stringify(schedule), state: state === undefined ? null : JSON.stringify(state) }),
    remove: (id: string) => void remove.run({ id }),
  }
}

export type Store = ReturnType<typeof openStore>
