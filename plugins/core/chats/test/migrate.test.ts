import type { Message } from '@sand/chats/contract'
import { Database } from 'bun:sqlite'
import { afterAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { open } from '../src/db'
import { v1 } from '../src/schema/v1'
import { createStore } from '../src/store'

const dir = mkdtempSync(join(tmpdir(), 'sand-chats-'))
const path = join(dir, 'sand.db')

afterAll(() => rmSync(dir, { recursive: true, force: true }))

const said = (role: Message['role'], text: string): Message => ({ role, content: [{ type: 'text', text }] })

const writeUnversioned = (messages: Message[]) => {
  const db = new Database(path, { create: true, strict: true })
  for (const sql of v1) db.run(sql)
  db.query("insert into chats (id, created, cwd, kind) values ('chat', 1, $cwd, 'thread')").run({ cwd: dir })
  const insert = db.query("insert into entries (id, session, parent, at, type, data, size) values ($id, 'chat', $parent, $at, 'message', $data, $size)")
  messages.forEach((message, index) => {
    const data = JSON.stringify(message)
    insert.run({ id: `e${index}`, parent: index ? `e${index - 1}` : null, at: index, data, size: data.length })
  })
  db.query("update chats set head = $head where id = 'chat'").run({ head: `e${messages.length - 1}` })
  const { epoch } = db.query<{ epoch: string }, []>('select epoch from sync').get()!
  const { seq } = db.query<{ seq: number }, []>('select max(seq) as seq from changes').get()!
  db.close()
  return `${epoch}.${seq}`
}

const storeOf = (db: Database) =>
  createStore(db, {
    hooks: { entry() {}, update() {}, settle() {}, remove() {} },
    busy: async () => false,
    closing: async () => undefined,
    projectOf: () => null,
    knownProject: () => false,
    scratch: id => join(dir, id),
  }).sessions

test('a database from before migrations keeps its chats, catch-up cursors and sync tokens', () => {
  const history = [said('user', 'hi'), said('assistant', 'hello'), said('user', 'how are you'), said('assistant', 'fine')]
  const token = writeUnversioned(history)

  const { db } = open(path)
  const sessions = storeOf(db)
  const chat = sessions.require('chat')
  expect(chat.messages()).toEqual(history)
  expect(chat.since('e1')?.map(entry => entry.id)).toEqual(['e2', 'e3'])

  const added = chat.append('message', said('user', 'and now?'))
  expect(chat.entries().map(entry => entry.id)).toEqual(['e0', 'e1', 'e2', 'e3', added.id])
  expect(chat.since('e3')).toEqual([added])
  expect(sessions.synced(token, [])).toMatchObject({ delta: true, sessions: [{ id: 'chat' }] })
  db.close()

  const reopened = open(path)
  expect(storeOf(reopened.db).require('chat').messages()).toEqual([...history, said('user', 'and now?')])
  reopened.db.close()
})
