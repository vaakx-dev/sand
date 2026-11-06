import type { Ledger } from '@sand/ledger/contract'

const schema = [['create table bot_threads (thread text primary key, bot text not null, at integer not null)']]

export const openStarts = (ledger: Ledger, started: (thread: string, bot: string) => void) => {
  ledger.migrate('bot-bridge', schema)
  const all = ledger.db.query<{ thread: string; bot: string }, []>('select thread, bot from bot_threads')
  const one = ledger.db.query<{ bot: string }, { thread: string }>('select bot from bot_threads where thread = $thread')
  const written = ledger.db.query('insert or ignore into bot_threads (thread, bot, at) values ($thread, $bot, $at)')
  const removed = ledger.db.query('delete from bot_threads where thread = $thread')

  return {
    all: () => Object.fromEntries(all.all().map(row => [row.thread, row.bot])),
    botOf: (thread: string) => one.get({ thread })?.bot,
    put(thread: string, bot: string) {
      if (written.run({ thread, bot, at: Date.now() }).changes) started(thread, bot)
    },
    remove: (thread: string) => void removed.run({ thread }),
  }
}

export type Starts = ReturnType<typeof openStarts>
