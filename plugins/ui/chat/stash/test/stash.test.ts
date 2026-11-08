import { startSand } from '@sand/harness'
import { expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import { stashAdd, stashList, stashRemove } from '../src/contract'

test('stashed messages are listed newest first, survive a restart and can be removed', async () => {
  const first = await startSand([{ id: 'fake', models: ['m'], replies: [], api: 'anthropic' }], { plugins: ['ui/chat/stash'] })
  const older = await first.ask(stashAdd, { text: 'first idea', content: [], chat: 'Helper' })
  await first.ask(stashAdd, { text: 'second idea', content: [{ type: 'text', text: 'notes' }], chat: 'Planning' })
  await first.app.dispose()

  const again = await startSand([{ id: 'fake', models: ['m'], replies: [], api: 'anthropic' }], { plugins: ['ui/chat/stash'], home: first.home })
  expect((await again.ask(stashList, {})).map(entry => entry.text)).toEqual(['second idea', 'first idea'])
  await again.ask(stashRemove, { id: older.id })
  expect(await again.ask(stashList, {})).toMatchObject([{ text: 'second idea', chat: 'Planning', content: [{ type: 'text', text: 'notes' }] }])
  await again.stop()
  rmSync(again.home, { recursive: true, force: true })
})
