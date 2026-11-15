import { type Message, searchableText } from '@sand/chats/contract'
import type { Ledger } from '@sand/ledger/contract'
import type { ChatOwner } from './contract'
import { chatText } from './match'

export interface Block {
  rowid: number
  owner: ChatOwner
  chat: string
  entry: string
  block: number
  role: Message['role']
}

export interface Matching {
  match: string
  from: number
  below: number
  most: number
}

interface SourceRow {
  source: number
  owner: ChatOwner
  entry: string
  chat: string
  at: number
  data: string
}

type Bindings = Record<string, string | number>

const SLOTS_PER_MS = 1024
const CHUNK = 2000

const SOURCE_ROWS = `select e.rowid as source, case c.kind when 'bot' then 'bot' else 'thread' end as owner, e.id as entry, e.session as chat, e.at as at, e.data as data
  from entries e join chats c on c.id = e.session
  where e.rowid > $after and e.rowid <= $upto and e.type = 'message' and c.kind != 'agent' order by e.rowid`

const MIGRATIONS = [
  [
    `create virtual table message_search using fts5(text, chat, content='', contentless_delete=1, tokenize='unicode61 remove_diacritics 2')`,
    `create table message_search_blocks (
      rowid integer primary key,
      owner text not null,
      chat text not null,
      entry text not null,
      block integer not null,
      role text not null
    )`,
    'create index message_search_blocks_chat on message_search_blocks (owner, chat)',
    'create table message_search_marks (owner text primary key, mark integer not null)',
  ],
  [
    `delete from message_search where rowid in (select rowid from message_search_blocks where owner = 'bot')`,
    `delete from message_search_blocks where owner = 'bot'`,
    'drop index message_search_blocks_chat',
    'create index message_search_blocks_chat on message_search_blocks (chat)',
    'create table message_search_mark (id integer primary key check (id = 1), mark integer not null)',
    `insert into message_search_mark (id, mark) select 1, mark from message_search_marks where owner = 'thread'`,
    'drop table message_search_marks',
  ],
]

const INSERT_BLOCK = `insert into message_search_blocks (rowid, owner, chat, entry, block, role)
  values ((select coalesce(max(rowid) + 1, $first) from message_search_blocks where rowid >= $first and rowid < $first + ${SLOTS_PER_MS}), $owner, $chat, $entry, $block, $role)`

const timeOf = (rowid: number) => Math.floor(rowid / SLOTS_PER_MS)

const firstSlot = (at: number) => at * SLOTS_PER_MS

const NEWEST_MATCHES = 's.message_search match $match and s.rowid >= $from and s.rowid < $below order by s.rowid desc'

class Store {
  constructor(private readonly ledger: Ledger) {
    ledger.migrate('message-search', MIGRATIONS)
  }

  private get db() {
    return this.ledger.db
  }

  private top() {
    return this.db.query<{ top: number | null }, Bindings>('select max(rowid) as top from entries').get({})?.top ?? 0
  }

  private mark() {
    return this.db.query<{ mark: number }, Bindings>('select mark from message_search_mark').get({})?.mark ?? 0
  }

  private setMark(mark: number) {
    this.db.query('insert into message_search_mark (id, mark) values (1, $mark) on conflict (id) do update set mark = $mark').run({ mark })
  }

  private lowerMark() {
    this.setMark(Math.min(this.mark(), this.top()))
  }

  private add({ owner, entry, chat, at, data }: SourceRow) {
    const message: Message = JSON.parse(data)
    const insertBlock = this.db.query<unknown, Bindings>(INSERT_BLOCK)
    const insertText = this.db.query<unknown, Bindings>('insert into message_search (rowid, text, chat) values ($rowid, $text, $chat)')
    for (const { block, text } of searchableText(message)) {
      const { lastInsertRowid } = insertBlock.run({ first: firstSlot(at), owner, chat, entry, block, role: message.role })
      insertText.run({ rowid: Number(lastInsertRowid), text, chat: chatText(owner, chat) })
    }
  }

  lag() {
    this.lowerMark()
    return this.top() - this.mark()
  }

  private addUntil(rows: SourceRow[], deadline: number) {
    for (const row of rows) {
      this.add(row)
      if (performance.now() > deadline) return row.source
    }
    return undefined
  }

  step(deadline: number) {
    return this.ledger.tx(() => {
      const after = this.mark()
      const upto = Math.min(this.top(), after + CHUNK)
      const rows = this.db.query<SourceRow, Bindings>(SOURCE_ROWS).all({ after, upto })
      const mark = this.addUntil(rows, deadline) ?? upto
      this.setMark(mark)
      return mark - after
    })
  }

  drop(chat: string) {
    this.ledger.tx(() => {
      this.db.query('delete from message_search where rowid in (select rowid from message_search_blocks where chat = $chat)').run({ chat })
      this.db.query('delete from message_search_blocks where chat = $chat').run({ chat })
      this.lowerMark()
    })
  }

  matching({ match, from, below, most }: Matching): Block[] {
    const sql = `select b.rowid, b.owner, b.chat, b.entry, b.block, b.role from message_search s cross join message_search_blocks b on b.rowid = s.rowid
      where ${NEWEST_MATCHES} limit $most`
    return this.db.query<Block, Bindings>(sql).all({ match, from, below, most })
  }

  oldestOfNewest({ match, below, most }: Omit<Matching, 'from'>) {
    const sql = `select s.rowid from message_search s where ${NEWEST_MATCHES} limit 1 offset $skip`
    return this.db.query<{ rowid: number }, Bindings>(sql).get({ match, from: 0, below, skip: most - 1 })?.rowid ?? 0
  }

  text({ entry, block }: Block) {
    const row = this.db.query<{ data: string }, Bindings>('select data from entries where id = $entry').get({ entry })
    const message: Message | undefined = row && JSON.parse(row.data)
    return message && searchableText(message).find(searchable => searchable.block === block)?.text
  }
}

export { firstSlot, Store, timeOf }
