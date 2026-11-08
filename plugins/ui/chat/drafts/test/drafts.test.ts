import { startSand } from '@sand/harness'
import { expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import { draftsAll, draftsRead, draftsWrite } from '../src/contract'

const start = (home?: string) => startSand([{ id: 'fake', models: ['m'], replies: [], api: 'anthropic' }], { plugins: ['ui/chat/drafts'], ...(home && { home }) })

test('a draft is kept per chat across restarts and cleared once sent', async () => {
  const first = await start()
  await first.ask(draftsWrite, { key: 'bot:helper', draft: { text: 'half a thought', items: [{ type: 'text', text: 'notes' }], updated: 1 } })
  await first.ask(draftsWrite, { key: 'thread-1', draft: { text: 'other chat', items: [] } })
  const home = first.home
  await first.app.dispose()

  const again = await start(home)
  expect(await again.ask(draftsRead, { key: 'bot:helper' })).toEqual({ text: 'half a thought', items: [{ type: 'text', text: 'notes' }], updated: 1 })
  await again.ask(draftsWrite, { key: 'bot:helper', draft: null })
  expect(await again.ask(draftsRead, { key: 'bot:helper' })).toBeNull()
  expect((await again.ask(draftsAll, {})).map(draft => draft.text)).toEqual(['other chat'])
  await again.stop()
  rmSync(again.home, { recursive: true, force: true })
})
