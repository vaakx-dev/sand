import { mediaBlocks, type Message } from '@sand/chats/contract'
import { startSand } from '@sand/harness'
import { createLedger } from '@sand/ledger/contract'
import { Database } from 'bun:sqlite'
import { afterAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { moveInlineMedia } from '../src/media/backfill'
import { migrateChats } from '../src/schema'
import { v1 } from '../src/schema/v1'
import { createStore } from '../src/store'

const dir = mkdtempSync(join(tmpdir(), 'sand-chats-'))
const path = join(dir, 'sand.db')

afterAll(() => rmSync(dir, { recursive: true, force: true }))

const said = (role: Message['role'], text: string): Message => ({ role, content: [{ type: 'text', text }] })

const writeUnversioned = (messages: unknown[], file = path) => {
  const db = new Database(file, { create: true, strict: true })
  for (const sql of v1) db.run(sql)
  db.query("insert into chats (id, created, cwd, kind, settled) values ('chat', 1, $cwd, 'thread', 5)").run({ cwd: dir })
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

const open = (file: string) => {
  const book = createLedger(new Database(file, { create: true, strict: true }))
  migrateChats(book)
  return book
}

const storeOf = (db: Database) =>
  createStore(db, {
    hooks: { entry() {}, update() {}, archive() {}, remove() {} },
    busy: async () => false,
    closing: async () => undefined,
    projectOf: () => null,
    knownProject: () => false,
    scratch: id => join(dir, id),
  }).sessions

test('a database from before migrations keeps its chats, archive times, catch-up cursors and sync tokens', () => {
  const history = [said('user', 'hi'), said('assistant', 'hello'), said('user', 'how are you'), said('assistant', 'fine')]
  const token = writeUnversioned(history)

  const { db } = open(path)
  const sessions = storeOf(db)
  const chat = sessions.require('chat')
  expect(chat.messages()).toEqual(history)
  expect(chat.archived).toBe(5)
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

test('images and documents an old chat held inline move to the media store with their bytes, names and places in the chat', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-chats-home-'))
  const png = Uint8Array.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
  const inlineImage = { type: 'image', mediaType: 'image/png', data: png.toBase64(), name: 'shot.png', path: '/old/shot.png' }
  const inlineNote = { type: 'document', mediaType: 'text/plain', data: 'meeting notes', name: 'notes.txt' }
  writeUnversioned(
    [
      { role: 'user', content: [{ type: 'text', text: 'look' }, inlineImage, inlineNote] },
      { role: 'assistant', content: [{ type: 'tool_call', id: 'call', name: 'shot', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', callId: 'call', content: [{ type: 'text', text: 'done' }, inlineImage] }] },
    ],
    join(home, 'old.db'),
  )
  const sand = await startSand([], { home })
  const ledger = open(join(home, 'old.db'))

  expect(await moveInlineMedia({ ledger, media: sand.media, signal: new AbortController().signal })).toBeUndefined()
  const [image, note, shown] = mediaBlocks(storeOf(ledger.db).require('chat').messages())

  expect(image).toEqual({ type: 'image', mediaType: 'image/png', name: 'shot.png', hash: expect.any(String), size: png.length, width: 1, height: 1 })
  expect(sand.media.data(image!)).toBe(png.toBase64())
  expect(note).toMatchObject({ type: 'document', mediaType: 'text/plain', name: 'notes.txt', size: 13 })
  expect(sand.media.data(note!)).toBe('meeting notes')
  expect(shown).toEqual(image)
  ledger.db.close()
  await sand.stop()
  rmSync(home, { recursive: true, force: true })
})
