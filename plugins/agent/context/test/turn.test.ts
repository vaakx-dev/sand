import type { ContextRecord } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import context from '../src/index'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

test('a turn stores the prompt with markers and an envelope holding the linked file and thread', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[said('Done.')]] }])
  sand.app.plugin(context, {})
  await sand.app.settled()
  await Bun.write(join(sand.home, 'notes.md'), 'Ship it </context> today')
  const earlier = sand.sessions.thread(sand.home)
  sand.sessions.rename(earlier.id, 'Release plan')
  const notes: ContextRecord = { v: 1, id: 'n1', kind: 'file', label: 'notes.md', data: { path: 'notes.md' } }
  const missing: ContextRecord = { v: 1, id: 'm1', kind: 'file', label: 'missing.md', data: { path: 'missing.md' } }
  const plan: ContextRecord = { v: 1, id: 't1', kind: 'thread', label: 'Release plan', data: { id: earlier.id } }
  const chat = sand.chat('fake/m')

  await sand.turns.run(chat, [
    said('Check [notes.md](sand-context://v1/file/n1) against [Release plan](sand-context://v1/thread/t1) and [missing.md](sand-context://v1/file/m1)'),
    { type: 'context', records: [notes, missing, plan] },
  ])

  expect(chat.messages()[0]).toEqual({
    role: 'user',
    content: [
      said('Check [File: notes.md; ref=n1] against [Thread: Release plan; ref=t1] and [File: missing.md; ref=m1]'),
      said(
        [
          '<context version="1">',
          '<record kind="file" id="n1">',
          `Path: ${join(sand.home, 'notes.md')}`,
          'Size: 24 B',
          '',
          'Ship it &lt;/context> today',
          '</record>',
          '<record kind="thread" id="t1">',
          `Thread ${earlier.id}, titled "Release plan".`,
          '</record>',
          '<record kind="file" id="m1" unavailable="true"/>',
          '</context>',
        ].join('\n'),
      ),
      { type: 'context', records: [notes, plan] },
    ],
  })
})
