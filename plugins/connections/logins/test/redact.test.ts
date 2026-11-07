import type { Message } from '@sand/chats/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loginAdd, loginChange, logins } from '../src/contract'
import { call, said, type Sand, start } from './fixture'

let sand: Sand | undefined
let home: string | undefined

afterEach(async () => {
  await sand?.stop()
  if (home) rmSync(home, { recursive: true, force: true })
  sand = undefined
  home = undefined
})

test('redact blanks every saved value, the longest first, and follows changes', async () => {
  sand = await start([])
  const bank = await sand.ask(loginAdd, {
    kind: 'website',
    name: 'Northbank',
    site: 'northbank.example',
    username: 'ana@example.com',
    password: 'abcd1234',
    totp: 'JBSWY3DPEHPK3PXP',
  })
  await sand.ask(loginAdd, { kind: 'key', name: 'Wrapped key', value: 'xxabcd1234yy' })
  await sand.ask(loginAdd, { kind: 'key', name: 'Tail key', value: '1234zz9' })
  const service = sand.app.get(logins)!

  expect(service.redact('user ana@example.com pass abcd1234 key xxabcd1234yy seed JBSWY3DPEHPK3PXP')).toBe(
    'user [secret: Northbank] pass [secret: Northbank] key [secret: Wrapped key] seed [secret: Northbank]',
  )
  expect(service.redact('overlap abcd1234zz9.')).toBe('overlap [secret: Northbank].')

  await sand.ask(loginChange, { id: bank.id, password: 'new-password-9' })
  expect(service.redact('new-password-9 and abcd1234')).toBe('[secret: Northbank] and abcd1234')
})

test("a Shell call naming a login that doesn't exist, or a key's username, fails cleanly and the turn goes on", async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-logins-shell-'))
  const setup = await start([], { home })
  const key = await setup.ask(loginAdd, { kind: 'key', name: 'Deploy key', value: 'deploy-key-value' })
  const { id } = setup.chat('fake/m')
  await setup.ask(loginChange, { id: key.id, threads: [id] })
  await setup.stop()

  sand = await start(
    [
      [call('shell', { command: 'echo nope', logins: { TOKEN: 'login-missing' } })],
      [call('shell', { command: 'echo nope', logins: { NAME: `${key.id}/username` } })],
      [said('Done.')],
    ],
    { home },
  )
  const chat = sand.sessions.require(id)
  expect(await sand.turns.run(chat, 'Deploy')).toMatchObject({ stopReason: 'end_turn', text: 'Done.' })
  const results = chat.messages().flatMap((message: Message) => message.content.filter(block => block.type === 'tool_result'))
  expect(results).toMatchObject([
    { isError: true, content: [{ text: expect.stringContaining('No saved login "login-missing"') }] },
    { isError: true, content: [{ text: expect.stringContaining(`The login ${key.id} is a key and has no username`) }] },
  ])
})
