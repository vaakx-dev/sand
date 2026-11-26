import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { blankConversation } from '../src/blank'

const SECRET = 'harbour-key-7731'

const folders: string[] = []

afterEach(async () => {
  await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true })))
})

const field = (tag: number, text: string) => {
  const bytes = Buffer.from(text)
  return Buffer.concat([Buffer.from([tag, bytes.length]), bytes])
}

const step = (password: string) => Buffer.concat([field(0x0a, 'mcp_sand_login'), field(0x12, JSON.stringify({ site: 'Northbank', password })), field(0x1a, password)])

const output = Buffer.alloc(6000, 'o')

const savedConversation = async () => {
  const folder = await mkdtemp(join(tmpdir(), 'agy-blank-'))
  folders.push(folder)
  const path = join(folder, 'conversation.db')
  const database = new Database(path)
  database.run('pragma journal_mode = wal')
  database.run('pragma secure_delete = off')
  database.run('create table steps (idx integer primary key, step_payload blob)')
  database.query('insert into steps values (?, ?)').run(0, Buffer.concat([step(SECRET), output]))
  database.query('insert into steps values (?, ?)').run(1, step(SECRET))
  database.run('delete from steps where idx = 1')
  database.close()
  return { folder, path }
}

const filesHold = async (folder: string, text: string) => {
  const names = await readdir(folder)
  const contents = await Promise.all(names.map(name => Bun.file(join(folder, name)).bytes()))
  return contents.some(bytes => Buffer.from(bytes).includes(text))
}

test('a secret the model sent through an agy session is masked everywhere in its saved conversation, and the steps still read back', async () => {
  const { folder, path } = await savedConversation()

  await blankConversation(path, [SECRET])

  expect(await filesHold(folder, SECRET)).toBe(false)
  const database = new Database(path, { readonly: true })
  const { step_payload } = database.query<{ step_payload: Uint8Array }, []>('select step_payload from steps').get()!
  database.close()
  expect(Buffer.from(step_payload)).toEqual(Buffer.concat([step('*'.repeat(SECRET.length)), output]))
})
