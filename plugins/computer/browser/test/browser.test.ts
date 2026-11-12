import { findBrowser } from '@sand/cdp'
import { center, parseKeys, type UiElement } from '@sand/computers/contract'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { removeFolder } from '@sand/util/fs'
import { mkdtempSync } from 'node:fs'
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
      #pad { position: absolute; left: 600px; top: 40px; width: 300px; height: 200px; background: #cde; user-select: none; }
      #card { position: absolute; left: 600px; top: 260px; width: 100px; height: 60px; background: #edc; }
      #bin { position: absolute; left: 800px; top: 260px; width: 150px; height: 100px; background: #dec; }
      #fields { position: absolute; left: 420px; top: 420px; width: 300px; }
      #frames { position: absolute; left: 960px; top: 0; }
      #frames iframe { display: block; width: 300px; height: 230px; margin: 8px; }
      button, input { font-size: 20px; margin: 4px; }
      #rows { position: fixed; left: 0; bottom: 0; width: 400px; height: 150px; overflow: auto; background: #fff; }
      #rows p { margin: 0; }
    </style>
  </head>
  <body>
    <div id="rows"><p hidden>Row 32 hidden</p></div>
    <div id="top">
      <button id="add">Add one</button>
      <button id="later">Later</button>
      <a href="/other" target="_blank">Open other</a>
      <form id="form"><input id="name" aria-label="Name" /></form>
      <p id="count">Count: 0</p>
      <p id="echo">Echo: none</p>
      <p id="submitted">Submitted: none</p>
      <p id="scrolled">Scrolled: 0</p>
      <p id="mouse">Mouse: none</p>
      <p id="seen"></p>
      <p id="automated"></p>
      <button id="revoke">Hold to revoke</button>
      <p id="revoked">Revoked: no</p>
      <button id="pick">Pick</button>
      <p id="picked">Picked: none</p>
      <p id="dropped">Dropped: none</p>
      <div id="card" draggable="true" aria-label="Card" role="region"></div>
      <div id="bin" aria-label="Bin" role="region"></div>
      <div id="pad" aria-label="Pad" role="region"></div>
      <div id="fields">
        <select id="fruit" aria-label="Fruit"><option>Apple</option><option>Banana</option><option>Cherry</option></select>
        <textarea id="area" aria-label="Area"></textarea>
        <div id="note" aria-label="Note" role="textbox" contenteditable></div>
        <p id="fruited">Fruit: Apple</p>
        <p id="noted">Note: ""</p>
        <p id="wrote">Area: ""</p>
      </div>
      <div id="frames">
        <iframe src="/local"></iframe>
        <iframe src="REMOTE"></iframe>
      </div>
    </div>
    <script>
      const show = (id, text) => (document.getElementById(id).textContent = text)
      for (let row = 1; row <= 400; row++) document.getElementById('rows').append(Object.assign(document.createElement('p'), { textContent: 'Row ' + row }))
      document.getElementById('later').onclick = () => setTimeout(() => show('count', 'Count: later'), 150)
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
      document.getElementById('fruit').onchange = event => show('fruited', 'Fruit: ' + event.target.value)
      document.getElementById('area').oninput = event => show('wrote', 'Area: ' + JSON.stringify(event.target.value))
      document.getElementById('note').oninput = event => show('noted', 'Note: ' + JSON.stringify(event.target.innerText))
      const headless = /Headless/.test(navigator.userAgent + JSON.stringify(navigator.userAgentData.brands))
      show('automated', 'Automated: ' + (navigator.webdriver || headless || screen.width < outerWidth ? 'shows' : 'hidden'))
      show('seen', document.cookie.includes('seen=1') ? 'Seen: before' : 'Seen: first')
      document.cookie = 'seen=1; max-age=3600; path=/'
    </script>
  </body>
</html>`

const other = '<!doctype html><title>Other page</title><p>Other content</p>'

const counter = (label: string, child = '') => `<!doctype html>
<body style="margin: 0; font: 16px sans-serif">
  <button id="add">${label} add</button>
  <p id="count">${label}: 0</p>
  ${child && `<iframe src="${child}" style="width: 280px; height: 110px"></iframe>`}
  <script>
    let clicks = 0
    document.getElementById('add').onclick = () => (document.getElementById('count').textContent = '${label}: ' + ++clicks)
  </script>
</body>`

const server = Bun.serve({
  port: 0,
  fetch: request => {
    const pages: Record<string, string> = {
      '/': page.replace('REMOTE', `http://127.0.0.1:${server.port}/remote`),
      '/local': counter('Local', '/local-nested'),
      '/local-nested': counter('Local nested'),
      '/remote': counter('Remote', `${url}remote-nested`),
      '/remote-nested': counter('Remote nested'),
      '/other': other,
    }
    return new Response(pages[new URL(request.url).pathname], { headers: { 'content-type': 'text/html' } })
  },
})
const url = `http://localhost:${server.port}/`
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

const press = (combo: string) => computer.act({ type: 'key', keys: parseKeys(combo) })

const tabsShow = async (...lines: string[]) => {
  const note = async () => (await computer.screenshot()).note?.split('\n').slice(1)
  for (let tries = 0; tries < 40 && !Bun.deepEquals(await note(), lines); tries++) await Bun.sleep(50)
  expect(await note()).toEqual(lines)
}

describe.skipIf(!(await findBrowser()))('browser computer', () => {
  beforeAll(() => computer.act({ type: 'open', url }))

  afterAll(async () => {
    await computer.close()
    await server.stop(true)
    await removeFolder(profile)
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

  test('shows pages no sign of automation, even headless', async () => {
    expect(await texts()).toContain('Automated: hidden')
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

  test('types an option name into a select', async () => {
    await click(await find('combobox', 'Fruit'))
    await computer.act({ type: 'type', text: 'Cherry' })
    await computer.act({ type: 'key', keys: parseKeys('enter') })
    await eventually('Fruit: Cherry')
  })

  test('types lines and keyless characters into a textarea and an editable div', async () => {
    await click(await find('textbox', 'Area'))
    await computer.act({ type: 'type', text: 'One!\nTwo ✓ é' })
    await eventually('Area: "One!\\nTwo ✓ é"')
    const long = 'Long. '.repeat(50)
    await computer.act({ type: 'type', text: `\n${long}\n.` })
    await eventually(`Area: "One!\\nTwo ✓ é\\n${long}\\n."`)
    await click(await find('textbox', 'Note'))
    await computer.act({ type: 'type', text: 'A\nb' })
    await eventually('Note: "A\\nb"')
  })

  test('scrolls by wheel notches', async () => {
    await computer.act({ type: 'scroll', at: { x: 0.5, y: 0.8 }, dx: 0, dy: 3 })
    await eventually('Scrolled: 300')
  })

  test('lists and clicks buttons inside iframes of a scrolled page, nested and cross-origin', async () => {
    const found = await computer.elements()
    expect(new Set(found.map(element => element.ref)).size).toBe(found.length)
    for (const label of ['Local', 'Local nested', 'Remote', 'Remote nested']) {
      const button = await find('button', `${label} add`)
      expect(button.box.left).toBeGreaterThan(0.7)
      expect(button.box.right).toBeLessThanOrEqual(1)
      await click(button)
      await eventually(`${label}: 1`)
    }
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

  test('settles until a late update shows', async () => {
    await click(await find('button', 'Later'))
    await computer.settle()
    expect(await texts()).toContain('Count: later')
  })

  test('finds visible text inside a scrolling panel and scrolls the chosen match into view', async () => {
    const found = await computer.find('row 32', 2)
    expect(found.count).toBe(11)
    expect(found.box?.top).toBeGreaterThan(0.8)
    expect((await find('text', 'Row 320')).box.top).toBeCloseTo(found.box?.top ?? 0, 2)
    expect(await computer.find('row 32', 12)).toEqual({ count: 11 })
  })

  test('follows a link into a new tab, switches back and closes it', async () => {
    const first = `Computer test page — ${url}`
    const second = `Other page — ${url}other`
    await click(await find('link', 'Open other'))
    await tabsShow(`1. ${first}`, `2. [active] ${second}`)
    await eventually('Other content')
    await press('ctrl+1')
    await tabsShow(`1. [active] ${first}`, `2. ${second}`)
    await find('button', 'Add one')
    await press('ctrl+tab')
    await tabsShow(`1. ${first}`, `2. [active] ${second}`)
    await press('ctrl+w')
    await tabsShow(`1. [active] ${first}`)
    await find('button', 'Add one')
  })

  test('opens a blank tab with ctrl+t, and closing the first tab activates the next', async () => {
    await press('ctrl+t')
    await tabsShow(`1. Computer test page — ${url}`, '2. [active] about:blank — about:blank')
    await press('ctrl+shift+tab')
    await press('ctrl+w')
    await tabsShow('1. [active] about:blank — about:blank')
  })

  test('keeps cookies in its profile across restarts', async () => {
    await computer.close()
    computer = open()
    await computer.act({ type: 'open', url })
    await eventually('Seen: before')
  })
})
