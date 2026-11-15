import { sep } from 'node:path'

const quoted = (text: string) => `'${text.replaceAll("'", "''")}'`

const NEXT_SEQ = "(select seq from sqlite_sequence where name = 'changes')"

const MAIN_MODEL = "json_extract(b.models, '$.main')"

const lastEntry = (field: string) => `(select e.${field} from bot_entries e where e.bot = b.id order by e.seq desc limit 1)`

const chatsOf = (root: string) => [
  `insert into chats (id, created, cwd, project, head, kind, parent, origin, title, seen, pinned, archived, snoozed, position)
    select id, created, ${quoted(root + sep)} || id, null, null, 'bot', null, null, '', 1, 0, null, null, null from bots`,
  `insert into entries (id, session, parent, at, type, data, size, seq, turn)
    select id, bot, lag(id) over (partition by bot order by seq), at, type, data, length(data), ${NEXT_SEQ} + row_number() over (order by bot, seq), turn
    from bot_entries`,
  "update sqlite_sequence set seq = seq + (select count(*) from bot_entries) where name = 'changes'",
  `insert into entries (id, session, parent, at, type, data, size, seq, turn)
    select lower(hex(randomblob(16))), b.id, ${lastEntry('id')}, coalesce(${lastEntry('at')}, b.created), 'settings', ${MAIN_MODEL}, length(${MAIN_MODEL}),
      ${NEXT_SEQ} + row_number() over (order by b.id), null
    from bots b where ${MAIN_MODEL} != '{}'`,
  `update sqlite_sequence set seq = seq + (select count(*) from bots b where ${MAIN_MODEL} != '{}') where name = 'changes'`,
  "update chats set head = (select e.id from entries e where e.session = chats.id order by e.seq desc limit 1) where kind = 'bot'",
  'drop table bot_entries',
  'alter table bots drop column models',
]

export const schema = (root: string) => [
  [
    `create table bots (
      id text primary key,
      name text not null,
      initial text not null,
      color text not null,
      job text not null,
      models text not null,
      computer text not null,
      created integer not null,
      updated integer not null
    )`,
    `create table bot_entries (
      id text primary key,
      bot text not null,
      seq integer not null,
      at integer not null,
      type text not null,
      data text not null,
      turn text,
      unique (bot, seq)
    )`,
  ],
  ['alter table bots add column project text'],
  [
    `create table bot_jobs (
      bot text not null,
      replaced integer not null,
      job text not null
    )`,
    'create index bot_jobs_bot on bot_jobs (bot, replaced)',
  ],
  [
    'alter table bots add column paused integer not null default 0',
    'alter table bots add column budget real',
    'create index bot_entries_type on bot_entries (bot, type, at)',
  ],
  [
    "alter table bots add column projects text not null default '[]'",
    'update bots set projects = json_array(project) where project is not null',
    'alter table bots drop column project',
  ],
  ['drop table bot_jobs'],
  [
    'alter table bots drop column job',
    `create table bot_jobs (
      id text primary key,
      bot text not null,
      title text not null,
      goal text not null,
      done text not null,
      paused integer not null,
      created integer not null,
      updated integer not null
    )`,
    'create index bot_jobs_bot on bot_jobs (bot, created)',
  ],
  chatsOf(root),
]
