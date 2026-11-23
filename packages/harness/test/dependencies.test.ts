import { textOf } from '@sand/chats/contract'
import { tools } from '@sand/tools/contract'
import { afterAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startSand } from '../src'

const fake = [{ id: 'fake', api: 'anthropic' as const, models: ['m'], replies: [] }]

const lonely = mkdtempSync(join(tmpdir(), 'sand-lonely-'))

afterAll(() => rmSync(lonely, { recursive: true, force: true }))

test('a listed plugin brings the plugins it injects from, and theirs', async () => {
  const sand = await startSand(fake, { plugins: ['bots/bots', 'bots/turns', 'agent/file-tools'] })
  try {
    await Bun.write(join(sand.home, 'notes.txt'), 'buy figs\n')
    const session = sand.chat('fake/m')
    expect(sand.app.get(tools)!.names(session)).toEqual(expect.arrayContaining(['read', 'write', 'edit', 'glob', 'grep']))
    const result = await sand.app.get(tools)!.run(
      { type: 'tool_call', id: 'read-call', name: 'read', input: { path: 'notes.txt' } },
      { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress() {}, wait: () => () => {} },
    )
    expect(result.isError).toBeFalsy()
    expect(textOf(result.content)).toContain('buy figs')
  } finally {
    await sand.stop()
  }
})

test('a plugin whose dependency nothing provides stops the start, naming both', async () => {
  writeFileSync(join(lonely, 'package.json'), JSON.stringify({ name: '@sand/lonely', sand: { runtime: './index.js' } }))
  writeFileSync(join(lonely, 'index.js'), "export default { name: 'lonely', inject: { gift: { kind: 'service', id: 'gift' } }, apply() {} }\n")
  await expect(startSand(fake, { plugins: [lonely] })).rejects.toThrow('lonely needs gift (no plugin provides it)')
})
