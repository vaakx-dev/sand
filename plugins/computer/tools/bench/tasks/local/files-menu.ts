import type { LocalTask, Seen, Verdict } from '../task'
import { layout, pick } from './layout'

interface Entry {
  id: number
  name: string
  folder: string
  starred: boolean
}

const names = [
  'Annual Budget 2023.xlsx',
  'Annual Budget 2024.xlsx',
  'Annual Budget 2024 (draft).xlsx',
  'Board Minutes March.docx',
  'Board Minutes May.docx',
  'Brand Guidelines.pdf',
  'Client List.csv',
  'Client List (old).csv',
  'Contract Acme.pdf',
  'Contract Acme (signed).pdf',
  'Holiday Photos.zip',
  'Invoice Template.docx',
  'Logo Pack.zip',
  'Marketing Plan Q1.pptx',
  'Marketing Plan Q2.pptx',
  'Meeting Notes.txt',
  'Onboarding Checklist.docx',
  'Org Chart.png',
  'Payroll Summary.xlsx',
  'Product Roadmap.pptx',
  'Product Roadmap (v2).pptx',
  'Receipts Scan.pdf',
  'Sales Forecast.xlsx',
  'Sales Forecast (copy).xlsx',
  'Screenshot 2024-02-11.png',
  'Screenshot 2024-02-14.png',
  'Team Photo.jpg',
  'Travel Itinerary.pdf',
  'Vendor Quotes.xlsx',
  'Website Copy.docx',
]

const starredAtStart = new Set([4, 9, 18, 27])
const foldersAtStart = new Map([
  [7, 'Shared'],
  [12, 'Projects/Alpha'],
  [19, 'Archive/2022'],
])

const start: Entry[] = names.map((name, index) => ({
  id: index + 1,
  name,
  folder: foldersAtStart.get(index + 1) ?? 'My Drive',
  starred: starredAtStart.has(index + 1),
}))

const lookalikes = start.filter(entry => [1, 2, 3, 8, 10, 14, 15, 21, 23, 24, 25, 26].includes(entry.id))
const moved = pick(lookalikes)
const starred = pick(lookalikes.filter(entry => entry !== moved))
const year = pick(['2022', '2023', '2024'])

const expected = start.map(entry => ({
  ...entry,
  folder: entry === moved ? `Archive/${year}` : entry.folder,
  starred: entry === starred || entry.starred,
}))

const fieldName = (id: number, key: string) => `file-${String(id).padStart(2, '0')}-${key}`

const css = `
.bar { background: #fff; border-bottom: 1px solid #d5d9e0; padding: 10px 24px; display: flex; gap: 24px; align-items: center; }
.bar b { font-size: 20px; color: #1a73e8; } .bar input { flex: 1; max-width: 520px; border: 0; background: #edf2fa; border-radius: 24px; padding: 10px 18px; }
.wrap { display: flex; } .side { width: 200px; padding: 16px; } .side div { padding: 8px 12px; border-radius: 0 16px 16px 0; } .side .on { background: #d3e3fd; font-weight: 600; }
.files { padding: 16px 24px; flex: 1; } .files h1 { font-size: 18px; margin: 0 0 12px; font-weight: 500; }
.tiles { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
.tile { background: #fff; border: 1px solid #d5d9e0; border-radius: 10px; padding: 8px; height: 150px; box-sizing: border-box; user-select: none; position: relative; }
.tile.picked { background: #e8f0fe; border-color: #1a73e8; }
.thumb { height: 76px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 15px; text-transform: uppercase; }
.label { font-size: 13px; margin-top: 6px; line-height: 1.25; max-height: 33px; overflow: hidden; word-break: break-word; }
.where { font-size: 11px; color: #5f6368; margin-top: 2px; } .star { position: absolute; top: 10px; right: 12px; color: #f9ab00; font-size: 18px; text-shadow: 0 0 2px #fff; }
.tile input.rename { width: 100%; box-sizing: border-box; font-size: 13px; margin-top: 4px; }
.menu { position: fixed; background: #fff; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,.35); padding: 6px 0; min-width: 190px; font-size: 14px; z-index: 10; }
.menu .row { padding: 7px 16px; display: flex; justify-content: space-between; gap: 24px; cursor: default; } .menu .row:hover { background: #f1f3f4; } .menu hr { border: 0; border-top: 1px solid #dadce0; margin: 6px 0; }
.toast { position: fixed; left: 24px; bottom: 24px; background: #202124; color: #fff; padding: 12px 18px; border-radius: 6px; z-index: 20; display: flex; gap: 18px; } .toast button { background: none; border: 0; color: #8ab4f8; cursor: pointer; }
.preview { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 30; } .preview div { background: #fff; padding: 24px 32px; border-radius: 10px; }`

const page = layout(
  'Drive - All files',
  `<style>${css}</style><div class="bar"><b>Drive</b><input type="text" placeholder="Search in Drive" aria-label="Search in Drive"></div>
<div class="wrap"><div class="side"><div class="on">All files</div><div>Shared with me</div><div>Recent</div><div>Trash</div></div>
<div class="files"><h1>All files</h1><div class="tiles" id="tiles"></div></div></div><div id="hidden"></div>`,
  `const entries = ${JSON.stringify(start)}
const kinds = { xlsx: '#188038', docx: '#1a73e8', pptx: '#e8710a', pdf: '#d93025', csv: '#188038', txt: '#5f6368', zip: '#795548', png: '#a142f4', jpg: '#a142f4' }
const deleted = new Set()
let picked = 0
let chain = []
let opener = 0
let closer = 0

const closeFrom = level => { while (chain.length > level) chain.pop().remove() }
const closeAll = () => { clearTimeout(opener); clearTimeout(closer); closeFrom(0) }

const sync = () => {
  document.getElementById('hidden').replaceChildren(...entries.flatMap(entry => {
    const key = String(entry.id).padStart(2, '0')
    return [['name', entry.name], ['folder', entry.folder], ['starred', entry.starred ? 'yes' : 'no'], ['deleted', deleted.has(entry.id) ? 'yes' : 'no']].map(([part, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'file-' + key + '-' + part
      input.value = value
      return input
    })
  }))
}

const toast = (text, undo) => {
  document.querySelector('.toast')?.remove()
  const box = document.createElement('div')
  box.className = 'toast'
  box.textContent = text
  if (undo) {
    const button = document.createElement('button')
    button.textContent = 'Undo'
    button.onclick = () => { undo(); box.remove() }
    box.append(button)
  }
  document.body.append(box)
  setTimeout(() => box.remove(), 6000)
}

const render = () => {
  document.getElementById('tiles').replaceChildren(...entries.filter(entry => !deleted.has(entry.id)).map(entry => {
    const tile = document.createElement('div')
    tile.className = 'tile' + (picked === entry.id ? ' picked' : '')
    tile.dataset.id = entry.id
    const ext = entry.name.split('.').pop()
    tile.innerHTML = '<div class="thumb" style="background:' + kinds[ext] + '">' + ext + '</div><div class="label"></div><div class="where"></div>' + (entry.starred ? '<span class="star" title="Starred">★</span>' : '')
    tile.querySelector('.label').textContent = entry.name
    tile.querySelector('.where').textContent = entry.folder.replace('/', ' › ')
    tile.onclick = () => { picked = entry.id; render() }
    tile.ondblclick = () => open(entry)
    tile.oncontextmenu = event => {
      event.preventDefault()
      event.stopPropagation()
      picked = entry.id
      render()
      showMenu(menuFor(entry), 0, event.clientX, event.clientY)
    }
    return tile
  }))
  sync()
}

const open = entry => {
  const box = document.createElement('div')
  box.className = 'preview'
  box.innerHTML = '<div><h2></h2><p>No preview available.</p><button type="button">Close</button></div>'
  box.querySelector('h2').textContent = entry.name
  box.querySelector('button').onclick = () => box.remove()
  document.body.append(box)
}

const rename = entry => {
  const label = document.querySelector('[data-id="' + entry.id + '"] .label')
  const input = document.createElement('input')
  input.className = 'rename'
  input.value = entry.name
  const done = () => { entry.name = input.value.trim() || entry.name; render() }
  input.onkeydown = event => { if (event.key === 'Enter') done(); if (event.key === 'Escape') render() }
  input.onblur = done
  label.replaceChildren(input)
  input.focus()
}

const moveTo = (entry, folder) => {
  entry.folder = folder
  render()
  toast('Moved "' + entry.name + '" to ' + folder.replace('/', ' › '))
}

const folder = (label, path) => ({ label, run: entry => moveTo(entry, path) })

const menuFor = entry => [
  { label: 'Open', run: open },
  { label: 'Rename', run: rename },
  { label: entry.starred ? 'Remove star' : 'Add star', run: () => { entry.starred = !entry.starred; render(); toast(entry.starred ? 'Added to Starred' : 'Removed from Starred') } },
  { label: 'Move to', sub: [
    { label: 'Archive', sub: [folder('2022', 'Archive/2022'), folder('2023', 'Archive/2023'), folder('2024', 'Archive/2024')] },
    { label: 'Projects', sub: [folder('Alpha', 'Projects/Alpha'), folder('Beta', 'Projects/Beta'), folder('Gamma', 'Projects/Gamma')] },
    folder('Shared', 'Shared'),
  ] },
  'line',
  { label: 'Delete', run: () => { deleted.add(entry.id); render(); toast('"' + entry.name + '" moved to trash', () => { deleted.delete(entry.id); render() }) } },
]

const showMenu = (items, level, x, y, parent) => {
  closeFrom(level)
  const menu = document.createElement('div')
  menu.className = 'menu'
  menu.setAttribute('role', 'menu')
  menu.onmouseenter = () => clearTimeout(closer)
  menu.onmouseleave = () => { clearTimeout(closer); closer = setTimeout(() => closeFrom(1), 300) }
  for (const item of items) {
    if (item === 'line') { menu.append(document.createElement('hr')); continue }
    const row = document.createElement('div')
    row.className = 'row'
    row.setAttribute('role', 'menuitem')
    row.innerHTML = '<span></span><span></span>'
    row.firstChild.textContent = item.label
    row.lastChild.textContent = item.sub ? '▸' : ''
    const reveal = () => {
      const box = row.getBoundingClientRect()
      showMenu(item.sub, level + 1, box.right - 4, box.top - 6, box)
    }
    row.onmouseenter = () => {
      clearTimeout(opener)
      closeFrom(level + 1)
      if (item.sub) opener = setTimeout(reveal, 150)
    }
    row.onclick = event => {
      event.stopPropagation()
      if (item.sub) { clearTimeout(opener); reveal(); return }
      closeAll()
      item.run(entries.find(entry => entry.id === picked))
    }
    menu.append(row)
  }
  document.body.append(menu)
  const box = menu.getBoundingClientRect()
  let left = x
  if (left + box.width > innerWidth - 4) left = parent ? parent.left + 4 - box.width : innerWidth - box.width - 4
  menu.style.left = Math.max(4, left) + 'px'
  menu.style.top = Math.max(4, Math.min(y, innerHeight - box.height - 4)) + 'px'
  chain.push(menu)
}

document.oncontextmenu = event => { event.preventDefault(); closeAll() }
document.addEventListener('click', closeAll)
addEventListener('scroll', closeAll)
addEventListener('keydown', event => { if (event.key === 'Escape') closeAll() })
render()`,
)

const mismatches = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/files-menu\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the file manager is not open' }
  const wrong = expected.flatMap(entry =>
    Object.entries({ name: entry.name, folder: entry.folder, starred: entry.starred ? 'yes' : 'no', deleted: 'no' })
      .filter(([key, value]) => tab.fields[fieldName(entry.id, key)] !== value)
      .map(([key]) => `${entry.name} ${key}=${tab.fields[fieldName(entry.id, key)]}`),
  )
  return wrong.length ? { pass: false, why: `wrong state: ${wrong.join(', ')}` } : { pass: true, why: 'every file is where it should be' }
}

export const filesMenu: LocalTask = {
  id: 'files-menu',
  set: 'browser',
  place: 'local',
  kind: 'menu',
  prompt: site =>
    `Open ${site}/files-menu/, a file manager. Move the file "${moved.name}" to Archive › ${year} and add a star to the file "${starred.name}". Don't change anything else.`,
  check: mismatches,
  page: path => (path === '/' ? page : undefined),
}
