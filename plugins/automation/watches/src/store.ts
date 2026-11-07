import type { Ledger } from '@sand/ledger/contract'
import type { Watch } from './contract'
import { joined, type Queue } from './queue'

type Row = { id: string; body: string; state: string | null; queue: string; sending: string | null }

export const schema = [
  [
    `create table watches (
      id text primary key,
      body text not null,
      state text,
      queue text not null,
      sending text
    )`,
  ],
]

export interface Stored {
  watch: Watch
  state: unknown
  queue: Queue
  sending?: Queue
}

const jsonOf = (value: unknown) => (value === undefined ? null : JSON.stringify(value))

const storedOf = (row: Row): Stored => {
  const queue: Queue = JSON.parse(row.queue)
  return {
    watch: JSON.parse(row.body),
    state: row.state === null ? undefined : JSON.parse(row.state),
    queue: row.sending === null ? queue : joined(JSON.parse(row.sending), queue),
  }
}

export const openStore = ({ db, migrate }: Ledger) => {
  migrate('watches', schema)
  const all = db.query<Row, []>('select * from watches')
  const save = db.query<unknown, Row>('insert or replace into watches (id, body, state, queue, sending) values ($id, $body, $state, $queue, $sending)')
  const remove = db.query<unknown, { id: string }>('delete from watches where id = $id')
  return {
    load: () => all.all().map(storedOf),
    save: ({ watch, state, queue, sending }: Stored) =>
      void save.run({ id: watch.id, body: JSON.stringify(watch), state: jsonOf(state), queue: JSON.stringify(queue), sending: jsonOf(sending) }),
    remove: (id: string) => void remove.run({ id }),
  }
}

export type Store = ReturnType<typeof openStore>
