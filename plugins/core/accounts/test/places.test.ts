import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { loginAdd, loginLogout, loginRename } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

const until = async <T>(found: () => T | undefined, wait = 10_000) => {
  for (const end = Date.now() + wait; Date.now() < end; await Bun.sleep(20)) {
    const value = found()
    if (value) return value
  }
  throw new Error('It never happened')
}

test('an added account joins its plan under its own name without a model of its own, and leaves it once removed', async () => {
  sand = await startSand([{ id: 'fake', label: 'Fake Plan', models: ['m'], replies: [] }])
  const added = await sand.ask(loginAdd, { account: 'fake' })
  const members = () => (sand.llm.members?.('fake/m') ?? []).map(model => model.source)
  await until(() => members().includes(added))
  const listed = (await sand.ask(loginRename, { account: added, name: 'Spare' })).accounts.map(({ id, label, signedIn }) => ({ id, label, signedIn }))
  expect(listed).toContainEqual({ id: 'fake', label: 'Fake Plan', signedIn: true })
  expect(listed).toContainEqual({ id: added, label: 'Spare', signedIn: true })
  expect(sand.llm.models?.().map(model => model.id)).toEqual(['fake/m'])
  expect(sand.llm.find?.(`${added}/m`)?.id).toBe('fake/m')

  const renamed = (await sand.ask(loginRename, { account: 'fake', name: 'Main' })).accounts.map(({ id, label }) => ({ id, label }))
  expect(renamed).toContainEqual({ id: 'fake', label: 'Main' })
  expect(sand.llm.sources?.().map(source => source.label)).toEqual(['Fake Plan'])

  await sand.ask(loginLogout, { account: added })
  await until(() => !members().includes(added))
  expect(members()).toEqual(['fake'])
})
