import type { LocalTask, Seen, Verdict } from '../task'
import { layout, shuffled } from './layout'

interface Track {
  id: string
  title: string
  artist: string
  album: string
  length: string
}

const catalog: [string, string, string][] = [
  ['Glass Harbor', 'Nina Valdés', 'Low Tide Radio'],
  ['Paper Satellites', 'The Marigolds', 'Static Bloom'],
  ['Midnight Ferry', 'Oskar Lind', 'Northern Lines'],
  ['Copper Wires', 'Haruka Mori', 'Signal Garden'],
  ['Slow Cartography', 'Delphine Roche', 'Atlas of Rain'],
  ['Velvet Engine', 'The Marigolds', 'Static Bloom'],
  ['Saltwater Hymn', 'Tomas Brandt', 'Harbor Sessions'],
  ['Lantern Season', 'Nina Valdés', 'Low Tide Radio'],
  ['Orbit Theory', 'Kofi Mensah', 'Parallax'],
  ['Quiet Machinery', 'Haruka Mori', 'Signal Garden'],
  ['Dust and Neon', 'Ivo Petrenko', 'After Hours'],
  ['The Long Way Round', 'Delphine Roche', 'Atlas of Rain'],
  ['Bright Static', 'Kofi Mensah', 'Parallax'],
  ['Harbor Lights', 'Tomas Brandt', 'Harbor Sessions'],
  ['Tin Roof Summer', 'The Marigolds', 'Porch Light'],
  ['Cold Fusion Cafe', 'Ivo Petrenko', 'After Hours'],
  ['Wildflower Code', 'Mina Okafor', 'Greenhouse'],
  ['Moth to Monitor', 'Oskar Lind', 'Northern Lines'],
  ['Understudy', 'Mina Okafor', 'Greenhouse'],
  ['Parade of Ghosts', 'Delphine Roche', 'Atlas of Rain'],
  ['Neon Cathedral', 'Ivo Petrenko', 'After Hours'],
  ['Small Hours', 'Nina Valdés', 'Low Tide Radio'],
  ['Foxglove', 'Mina Okafor', 'Greenhouse'],
  ['Telegraph Hill', 'Tomas Brandt', 'Harbor Sessions'],
  ['Afterimage', 'Kofi Mensah', 'Parallax'],
  ['Rooftop Weather', 'Haruka Mori', 'Signal Garden'],
]

const tracks: Track[] = shuffled(catalog)
  .slice(0, 25)
  .map(([title, artist, album], index) => ({
    id: `t${String(index + 1).padStart(2, '0')}`,
    title,
    artist,
    album,
    length: `${2 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  }))

const far = shuffled(tracks.slice(12))
const first = far[0]!
const second = far[1]!
const third = far[2]!
const last = shuffled(tracks.slice(2, 10))[0]!

const wanted = [first, second, third, ...tracks.filter(track => ![first, second, third, last].includes(track)), last].map(track => track.id)

const row = (track: Track, index: number) =>
  `<li class="row" data-id="${track.id}"><span class="grip"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="num">${index + 1}</span><span class="cover" style="background:hsl(${(index * 47) % 360} 45% 55%)"></span><span class="name"><b>${track.title}</b><small>${track.artist}</small></span><span class="album">${track.album}</span><span class="time">${track.length}</span></li>`

const page = layout(
  'Playlist',
  `<style>
body { overflow: hidden; } main { max-width: 760px; padding-top: 16px; }
.top { display: flex; gap: 16px; align-items: center; margin-bottom: 12px; } .art { width: 64px; height: 64px; border-radius: 8px; background: linear-gradient(135deg, #23395d, #7a4fb5); }
h1 { margin: 0; font-size: 22px; } .top small { color: #667; }
#panel { height: 372px; overflow-y: auto; background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; }
#list { list-style: none; margin: 0; padding: 0; position: relative; }
.row { display: grid; grid-template-columns: 22px 28px 36px 1fr 180px 50px; gap: 10px; align-items: center; height: 46px; padding: 0 12px; box-sizing: border-box; border-bottom: 1px solid #eceff3; font-size: 14px; }
.row:hover { background: #f3f6fb; } .row.lifted { opacity: .4; }
.name { display: flex; flex-direction: column; line-height: 1.2; } .name small, .album, .num, .time { color: #667; font-size: 13px; } .time { text-align: right; }
.cover { width: 34px; height: 34px; border-radius: 4px; }
.grip { display: grid; grid-template-columns: 4px 4px; gap: 2px; width: 10px; padding: 3px; cursor: grab; justify-content: center; } .grip i { width: 4px; height: 4px; border-radius: 50%; background: #9aa3b2; }
.grip:hover i { background: #23395d; }
#line { position: absolute; left: 0; right: 0; height: 3px; background: #2155c4; pointer-events: none; display: none; z-index: 2; }
</style>
<header><b>Pulse Music</b><span>Library</span><span>Playlists</span><span>Radio</span></header>
<main><div class="top"><div class="art"></div><div><h1>Road trip mix</h1><small>${tracks.length} tracks</small></div></div>
<div id="panel"><ul id="list">${tracks.map(row).join('')}<li id="line"></li></ul></div>
<input type="hidden" name="order" value="${tracks.map(track => track.id).join('|')}"></main>`,
  `const panel = document.getElementById('panel')
const list = document.getElementById('list')
const line = document.getElementById('line')
const order = document.querySelector('input[name=order]')
const rows = () => [...list.querySelectorAll('.row')]
let lifted
let speed = 0
let lastOver = 0
const sync = () => {
  rows().forEach((row, index) => { row.querySelector('.num').textContent = index + 1 })
  order.value = rows().map(row => row.dataset.id).join('|')
}
const slotAt = y => Math.max(0, Math.min(rows().length, Math.round((y - list.getBoundingClientRect().top) / 46)))
document.addEventListener('mousedown', event => {
  const row = event.target.closest('.row')
  if (row && event.target.closest('.grip')) row.draggable = true
})
document.addEventListener('mouseup', () => rows().forEach(row => { row.draggable = false }))
list.addEventListener('dragstart', event => {
  lifted = event.target.closest('.row')
  event.dataTransfer.setData('text/plain', lifted.dataset.id)
  event.dataTransfer.effectAllowed = 'move'
  requestAnimationFrame(() => lifted.classList.add('lifted'))
})
panel.addEventListener('dragenter', event => { if (lifted) event.preventDefault() })
panel.addEventListener('dragover', event => {
  if (!lifted) return
  event.preventDefault()
  const box = panel.getBoundingClientRect()
  const edge = 56
  speed = event.clientY < box.top + edge ? -Math.ceil((box.top + edge - event.clientY) / 4) : event.clientY > box.bottom - edge ? Math.ceil((event.clientY - (box.bottom - edge)) / 4) : 0
  lastOver = Date.now()
  line.style.display = 'block'
  line.style.top = slotAt(event.clientY) * 46 - 1 + 'px'
})
setInterval(() => {
  if (lifted && Date.now() - lastOver < 150) panel.scrollTop += speed
}, 16)
panel.addEventListener('drop', event => {
  event.preventDefault()
  if (!lifted) return
  const before = rows()[slotAt(event.clientY)] ?? line
  if (before !== lifted) list.insertBefore(lifted, before)
  sync()
})
document.addEventListener('dragend', () => {
  lifted?.classList.remove('lifted')
  lifted = undefined
  speed = 0
  line.style.display = 'none'
  rows().forEach(row => { row.draggable = false })
})`,
)

const placed = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/playlist-dnd\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the playlist is not open' }
  const order = String(tab.fields.order ?? '')
  const name = (id: string) => tracks.find(track => track.id === id)?.title ?? id
  return order === wanted.join('|') ? { pass: true, why: 'playlist in order' } : { pass: false, why: `wrong order: ${order.split('|').map(name).join(', ')}` }
}

const title = (track: Track) => `"${track.title}" by ${track.artist}`

export const playlistDnd: LocalTask = {
  id: 'playlist-dnd',
  set: 'browser',
  place: 'local',
  kind: 'drag',
  prompt: site =>
    `Open the playlist at ${site}/playlist-dnd/. Reorder it so that ${title(first)} is track 1, ${title(second)} is track 2 and ${title(third)} is track 3, in that order. Then move ${title(last)} to the very end of the playlist. Every other track must keep its relative order. Tracks can only be reordered by dragging their grip handle (the dotted handle at the left of a row) with the mouse.`,
  check: placed,
  page: path => (path === '/' ? page : undefined),
}
