import { startSand } from '@sand/harness'
import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { momentKinds, notify } from '../src/contract'
import { loadMoments } from '../src/host/moments'
import { askMoment } from '../src/runtime/turns'

test('every moment is wanted until its kind is turned off, and the choice outlives a restart', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-notify-'))
  try {
    const moments = await loadMoments(home)
    expect(momentKinds.filter(moments.wanted)).toEqual([...momentKinds])

    await moments.set('finished', false)
    await moments.set('routine', false)
    await moments.set('routine', true)

    const restarted = await loadMoments(home)
    expect(restarted.off()).toEqual(['finished'])
    expect(momentKinds.filter(restarted.wanted)).toEqual(momentKinds.filter(kind => kind !== 'finished'))
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('an approval moment points at its thread, or at its bot so tapping opens the bot chat', () => {
  const decision = { id: 'd', title: 'Grok', turn: 't', call: 'c', tool: 'shell', effect: 'run', summary: 'ls', outcome: 'waiting', at: 0 } as const
  expect(askMoment({ ...decision, owner: 'thread', conversation: 'chat-1' })).toMatchObject({ kind: 'needs', thread: 'chat-1' })
  const bot = askMoment({ ...decision, owner: 'bot', conversation: 'grok' })
  expect(bot).toMatchObject({ kind: 'needs', bot: 'grok', title: 'Grok', text: 'shell: ls' })
  expect(bot).not.toHaveProperty('thread')
})

const offTopLevel = ['bots', 'calendar', 'computers', 'pcs', 'notifications', 'mcp-server', 'updates']

test('with Notifications off, a thread turn finishes and nothing fails', async () => {
  const model = { id: 'fake', models: ['m'], replies: [[{ type: 'text' as const, text: 'Done' }]] }
  const sand = await startSand([model], { config: `[features]\n${offTopLevel.map(id => `${id} = false`).join('\n')}` })
  try {
    expect(sand.app.get(notify)).toBeUndefined()
    const result = await sand.turns.run(sand.chat('fake/m'), 'hi')
    expect(result.text).toBe('Done')
    expect(sand.problems()).toEqual([])
  } finally {
    await sand.stop()
  }
}, 60_000)
