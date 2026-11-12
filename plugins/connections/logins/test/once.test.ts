import { openVault } from '@sand/vault'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { answerEntry, type AskAnswer, logins, loginsState, secretEntry, secretSave } from '../src/contract'
import { answer, call, leaksIn, said, start, threadEntries } from './fixture'

let home: string

afterEach(() => rmSync(home, { recursive: true, force: true }))

const tag = crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const values = { code: `${tag}-481516`, token: `tok_${tag}_Keep` }

test('a one-time secret works for one use and is never saved; one the user chooses to save becomes a login', async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-logins-once-'))
  const sand = await start(
    [
      [call('request_secret', { title: 'Sign-in code', reason: 'The code sent by email', once: true })],
      [call('request_secret', { title: 'Release token', reason: 'To publish once', once: true })],
      [said('Done.')],
    ],
    { home },
  )
  let stopped = false
  try {
    const chat = sand.chat('fake/m')
    const entries = threadEntries(sand, chat.id)
    const ran = sand.turns.run(chat, 'Sign in and publish')
    await answer(sand, chat.id, entries, secretEntry, secretSave, id => ({ session: chat.id, id, save: false, value: values.code }))
    await answer(sand, chat.id, entries, secretEntry, secretSave, id => ({ session: chat.id, id, save: true, value: values.token }))
    expect(await ran).toMatchObject({ text: 'Done.' })

    const [held, kept] = entries().flatMap(entry => (entry.type === answerEntry ? [entry.data as AskAnswer] : []))
    expect([held?.status, kept?.status]).toEqual(['held', 'saved'])
    expect((await sand.ask(loginsState, {})).logins.map(login => login.id)).toEqual([kept!.login!])

    const service = sand.app.get(logins)!
    const conversation = { owner: 'thread' as const, id: chat.id }
    expect(service.redact(`code=${values.code}`)).toBe('code=[secret: Sign-in code]')
    expect(await service.use(held!.login!, { conversation, action: 'env' })).toEqual({ kind: 'key', value: values.code })
    await expect(service.use(held!.login!, { conversation, action: 'env' })).rejects.toThrow('No saved login')
    expect(service.redact(`code=${values.code}`)).toBe('code=[secret: Sign-in code]')

    await sand.stop()
    stopped = true
    const stored = JSON.stringify(await openVault(home, 'logins', undefined).then(vault => vault.read()))
    expect(stored).toContain(values.token)
    expect(stored).not.toContain(values.code)
    expect((await leaksIn(home, { code: values.code })).found).toEqual([])
  } finally {
    if (!stopped) await sand.stop()
  }
})
