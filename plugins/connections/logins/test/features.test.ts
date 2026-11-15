import { sessions } from '@sand/chats/contract'
import { startSand } from '@sand/harness'
import { expect, test } from 'bun:test'
import { logins, loginsState } from '../src/contract'

const offTopLevel = ['threads', 'notifications', 'updates']

test('with threads off, logins loads and serves its state', async () => {
  const sand = await startSand([{ id: 'fake', models: ['m'], replies: [], api: 'anthropic' }], {
    config: `[features]\nlogins = true\n${offTopLevel.map(id => `${id} = false`).join('\n')}`,
  })
  try {
    expect(sand.problems()).toEqual([])
    expect(sand.app.get(sessions)).toBeUndefined()
    expect(sand.app.get(logins)).toBeDefined()
    expect((await sand.ask(loginsState, {})).logins).toEqual([])
  } finally {
    await sand.stop()
  }
})
