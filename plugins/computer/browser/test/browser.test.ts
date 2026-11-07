import { findBrowser } from '@sand/cdp'
import { center, parseKeys, type UiElement } from '@sand/computers/contract'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { browserComputer, pngSize } from '../src/computer'

const page = `<!doctype html>
<html>
  <head>
    <title>Computer test page</title>
    <style>
      body { margin: 0; font: 16px sans-serif; height: 3000px; }
      #top { position: fixed; top: 0; left: 0; right: 0; height: 400px; background: #eee; padding: 8px; }
      #pad { position: absolute; left: 600px; top: 40px; width: 300px; height: 200px; background: #cde; }
      #card { position: absolute; left: 600px; top: 260px; width: 100px; height: 60px; background: #edc; }
      #bin { position: absolute; left: 800px; top: 260px; width: 150px; height: 100px; background: #dec; }
      button, input { font-size: 20px; margin: 4px; }
    </style>
  </head>
  <body>
    <div id="top">
      <button id="add">Add one</button>
      <form id="form"><input id="name" aria-label="Name" /></form>
      <p id="count">Count: 0</p>
      <p id="echo">Echo: none</p>
      <p id="submitted">Submitted: none</p>
      <p id="scrolled">Scrolled: 0</p>
      <p id="mouse">Mouse: none</p>
      <p id="seen"></p>
      <button id="revoke">Hold to revoke</button>
      <p id="revoked">Revoked: no</p>
      <button id="pick">Pick</button>
      <p id="picked">Picked: none</p>
      <p id="dropped">Dropped: none</p>
      <div id="card" draggable="true" aria-label="Card" role="region"></div>
      <div id="bin" aria-label="Bin" role="region"></div>
      <div id="pad" aria-label="Pad" role="region"></div>
    </div>
    <script>
      const show = (id, text) => (document.getElementById(id).textContent = text)
      let count = 0
      document.getElementById('add').onclick = () => show('count', 'Count: ' + ++count)
      document.getElementById('name').oninput = event => show('echo', 'Echo: ' + event.target.value)
      document.getElementById('form').onsubmit = event => {
        event.preventDefault()
        show('submitted', 'Submitted: ' + document.getElementById('name').value)
      }
      addEventListener('scroll', () => show('scrolled', 'Scrolled: ' + Math.round(scrollY)))
      const pad = document.getElementById('pad')
      pad.ondblclick = () => show('mouse', 'Mouse: double')
      pad.oncontextmenu = event => {
        event.preventDefault()
        show('mouse', 'Mouse: right')
      }
      let from
      pad.onmousedown = event => (from = event.offsetX)
      pad.onmouseup = event => {
        if (from !== undefined && event.offsetX - from > 50) show('mouse', 'Mouse: dragged right')
        from = undefined
      }
      const revoke = document.getElementById('revoke')
      let pressed
      revoke.onpointerdown = () => (pressed = performance.now())
      revoke.onpointerup = () => {
        if (pressed !== undefined && performance.now() - pressed >= 1000) show('revoked', 'Revoked: yes')
        pressed = undefined
      }
      document.getElementById('pick').onclick = event => {
        const held = [event.ctrlKey && 'ctrl', event.shiftKey && 'shift'].filter(Boolean)
        show('picked', 'Picked: ' + (held.join('+') || 'plain'))
      }
      document.getElementById('card').ondragstart = event => event.dataTransfer.setData('text/plain', 'card')
      const bin = document.getElementById('bin')
      let entered
      bin.ondragenter = () => (entered ??= performance.now())
      bin.ondragover = event => event.preventDefault()
      bin.ondragleave = () => (entered = undefined)
      bin.ondrop = event => {
        event.preventDefault()
        show('dropped', 'Dropped: ' + (performance.now() - entered >= 800 ? 'after a rest' : 'too soon'))
        entered = undefined
      }
      show('seen', document.cookie.includes('seen=1') ? 'Seen: before' : 'Seen: first')
      document.cookie = 'seen=1; max-age=3600; path=/'
    </script>
  </body>
</html>`

const server = Bun.serve({ port: 0, fetch: () => new Response(page, { headers: { 'content-type': 'text/html' } }) })
const url = server.url.href
const profile = mkdtempSync(join(tmpdir(), 'sand-browser-computer-'))
const open = () => browserComputer({ id: 'test', label: 'Test browser', profile, headless: true })

let computer = open()

const find = async (role: string, name: string) => {
  const found = (await computer.elements()).find(element => element.role === role && element.name === name)
  if (!found) throw new Error(`no ${role} "${name}"`)
  return found
}

const texts = async () => (await computer.elements()).filter(element => element.role === 'text').map(element => element.name)

const eventually = async (text: string) => {
  for (let tries = 0; tries < 20 && !(await texts()).includes(text); tries++) await Bun.sleep(50)
  expect(await texts()).toContain(text)
}

const click = async (element: UiElement) => computer.act({ type: 'click', at: center(element.box) })

describe.skipIf(!(await findBrowser()))('browser computer', () => {
  beforeAll(() => computer.act({ type: 'open', url }), 30_000)

  afterAll(async () => {
    await computer.close()
    await server.stop(true)
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  })

  test('takes a png screenshot of the viewport', async () => {
    const shot = await computer.screenshot()
    expect(pngSize(shot.png)).toEqual({ width: shot.width, height: shot.height })
    expect(shot.width).toBeGreaterThan(1000)
    expect(shot.height).toBeGreaterThan(600)
  })

  test('lists elements with fractional boxes inside the screenshot', async () => {
    const button = await find('button', 'Add one')
    expect(button.box.left).toBeGreaterThanOrEqual(0)
    expect(button.box.right).toBeLessThanOrEqual(1)
    expect(button.box.right).toBeGreaterThan(button.box.left)
    expect(button.box.bottom).toBeLessThan(0.1)
    expect(await texts()).toContain('Count: 0')
    expect(await texts()).not.toContain('Add one')
  })

  test('clicks a button', async () => {
    await click(await find('button', 'Add one'))
    await click(await find('button', 'Add one'))
    await eventually('Count: 2')
  })

  test('types into a field and presses keys', async () => {
    await click(await find('textbox', 'Name'))
    await computer.act({ type: 'type', text: 'hello' })
    await eventually('Echo: hello')
    await computer.act({ type: 'key', keys: parseKeys('backspace') })
    await eventually('Echo: hell')
    await computer.act({ type: 'key', keys: parseKeys('ctrl+a') })
    await computer.act({ type: 'type', text: 'sand\n' })
    await eventually('Submitted: sand')
  })

  test('scrolls by wheel notches', async () => {
    await computer.act({ type: 'scroll', at: { x: 0.5, y: 0.8 }, dx: 0, dy: 3 })
    await eventually('Scrolled: 300')
  })

  test('double clicks, right clicks and drags', async () => {
    const pad = (await find('region', 'Pad')).box
    await computer.act({ type: 'double_click', at: center(pad) })
    await eventually('Mouse: double')
    await computer.act({ type: 'right_click', at: center(pad) })
    await eventually('Mouse: right')
    const y = center(pad).y
    await computer.act({ type: 'drag', from: { x: pad.left + 0.01, y }, to: { x: pad.right - 0.01, y } })
    await eventually('Mouse: dragged right')
  })

  test('holds a press-and-hold button long enough that a click does not', async () => {
    const revoke = await find('button', 'Hold to revoke')
    await click(revoke)
    await Bun.sleep(100)
    expect(await texts()).toContain('Revoked: no')
    await computer.act({ type: 'hold', at: center(revoke.box), ms: 1200 })
    await eventually('Revoked: yes')
  })

  test('holds modifier keys down through a click', async () => {
    const pick = center((await find('button', 'Pick')).box)
    await computer.act({ type: 'click', at: pick, keys: parseKeys('ctrl') })
    await eventually('Picked: ctrl')
    await computer.act({ type: 'click', at: pick, keys: parseKeys('ctrl+shift') })
    await eventually('Picked: ctrl+shift')
    await computer.act({ type: 'click', at: pick })
    await eventually('Picked: plain')
  })

  test('rests over a drop target before dropping when asked to', async () => {
    const card = center((await find('region', 'Card')).box)
    const bin = center((await find('region', 'Bin')).box)
    await computer.act({ type: 'drag', from: card, to: bin })
    await eventually('Dropped: too soon')
    await computer.act({ type: 'drag', from: card, to: bin, ms: 1000 })
    await eventually('Dropped: after a rest')
  })

  test('keeps cookies in its profile across restarts', async () => {
    await computer.close()
    computer = open()
    await computer.act({ type: 'open', url })
    await eventually('Seen: before')
  })
})
