import type { SessionInfo } from './contract'

export type ChatRow<T extends SessionInfo = SessionInfo> = Omit<T, 'seen' | 'pinned'> & { seen: number; pinned: number }

const columns =
  'c.id, c.created, c.cwd, c.project, c.head, c.kind, c.parent, c.origin, c.title, c.seen, c.orrin_view as orrinView, c.pinned, c.settled, c.snoozed, c.position'

export const chatRows = `select ${columns} from chats c`

export const summaryColumns = `${columns},
  coalesce((select max(at) from entries e where e.session = c.id and e.type != 'system'), c.created) as updated,
  (select count(*) from entries e where e.session = c.id and e.type = 'message') as messages`

export const chatOf = <T extends SessionInfo>(row: ChatRow<T>) => ({ ...row, seen: Boolean(row.seen), pinned: Boolean(row.pinned) }) as T

export const chatsOf = <T extends SessionInfo>(rows: ChatRow<T>[]) => rows.map(chatOf)
