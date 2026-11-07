import { findBrowser } from '@sand/cdp'
import { computers, osOf } from '@sand/computers/contract'
import type { Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { browserComputer } from '../src/computer'

const page = `<!doctype html><body style="margin:0">
<button id="add" style="position:fixed;left:0;top:0;width:50vw;height:50vh">Add one</button>
<p id="count" style="position:fixed;top:60vh">Count: 0</p>
<script>let count = 0; add.onclick = () => (document.getElementById('count').textContent = 'Count: ' + ++count)</script>`

const server = Bun.serve({ port: 0, fetch: () => new Response(page, { headers: { 'content-type': 'text/html' } }) })

const call = (name: string, input: Record<string, unknown>) => ({ type: 'call', name, input }) as const

const script = [
  call('computer_list', {}),
  call('computer_act', { computer: 'browser', action: { type: 'open', url: server.url.href } }),
  call('computer_act', { computer: 'browser', action: { type: 'click', at: { x: 0.25, y: 0.25 } } }),
  call('computer_elements', { computer: 'browser' }),
  call('computer_screenshot', { computer: 'browser' }),
  call('computer_act', { computer: 'browser', action: { type: 'click', at: { ref: 'nope' } } }),
]

let sand: Sand
let chat: Session
let browser: ReturnType<typeof browserComputer>

const turn = async () => {
  await sand.turns.run(chat, 'go')
  return chat.messages().at(-2)?.content[0]
}

describe.skipIf(!(await findBrowser()))('computer tools on a headless browser', () => {
  beforeAll(async () => {
    sand = await startSand([{ id: 'fake', models: ['m'], replies: script.flatMap(each => [[each], [{ type: 'text', text: 'ok' }]]) }], {
      plugins: ['computer/computers', 'computer/tools'],
    })
    browser = browserComputer({ id: 'browser', label: 'Test browser', profile: join(sand.home, 'computers', 'browser', 'profile'), headless: true })
    sand.app.get(computers)?.register(browser)
    chat = sand.chat('fake/m')
  })

  afterAll(async () => {
    await browser.close()
    await sand.stop()
    await server.stop(true)
  })

  test('the computer use tools are off until the user turns them on', async () => {
    const registry = sand.app.get(tools)
    expect(registry?.groups().find(group => group.name === 'computer')).toMatchObject({
      chosen: 'off',
      tools: ['computer_act', 'computer_elements', 'computer_list', 'computer_screenshot'],
    })
    await registry?.choose('computer', 'always')
  })

  test('a thread lists computers, opens a page, clicks at fractions and reads the result', async () => {
    expect(await turn()).toMatchObject({ content: [{ type: 'text', text: `browser: Test browser (browser, ${osOf(process.platform)})` }] })
    expect(await turn()).toMatchObject({ content: [{ type: 'text', text: 'Done: open.' }] })
    expect(await turn()).toMatchObject({ content: [{ type: 'text', text: 'Done: click.' }] })
    const elements = await turn()
    const listed = elements?.type === 'tool_result' && elements.content[0]?.type === 'text' ? elements.content[0].text : ''
    expect(listed).toMatch(/^\d+ button "Add one" \[0\.000, 0\.000, 0\.500, 0\.500\]$/m)
    expect(listed).toMatch(/^\d+ text "Count: 1" \[/m)
    expect(await turn()).toMatchObject({ content: [{ type: 'text', text: expect.stringMatching(/pixels\.\nTabs .*\n1\. \[active\] .* — http/) }, { type: 'image', mediaType: 'image/png' }] })
    expect(await turn()).toMatchObject({ isError: true, content: [{ type: 'text', text: expect.stringContaining('No element nope') }] })
  })
})
