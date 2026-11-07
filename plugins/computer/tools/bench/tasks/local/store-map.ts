import { all, answered, type LocalTask } from '../task'
import { layout, pick, shuffled } from './layout'

interface District {
  name: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  pins: number
}

const districts: District[] = [
  { name: 'Old Town', x: 0, y: 0, width: 300, height: 310, fill: '#efe6d6', pins: 7 },
  { name: 'Harbourside', x: 300, y: 0, width: 260, height: 310, fill: '#dde8ee', pins: 7 },
  { name: 'Midtown', x: 560, y: 0, width: 260, height: 310, fill: '#e8e6ee', pins: 7 },
  { name: 'Riverside', x: 0, y: 310, width: 260, height: 290, fill: '#e3ecd9', pins: 7 },
  { name: 'Eastgate', x: 260, y: 310, width: 300, height: 290, fill: '#f0e2dc', pins: 6 },
  { name: 'Hillcrest', x: 560, y: 310, width: 260, height: 290, fill: '#e4ead2', pins: 6 },
]

const names = [
  'Linden Row', 'Market Square', 'Quay Street', 'Foundry Lane', 'Chapel Walk', 'Station Road', 'Bridge End', 'Tannery Yard', 'Orchard Gate', 'Cobbler Mews',
  'Lantern Court', 'Ropewalk', 'Salt Wharf', 'Maple Parade', 'Kiln Hill', 'Beacon Plaza', 'Dyers Close', 'Granary Arcade', 'Fountain Place', 'Old Mill',
  'Harrow Cross', 'Weaver Street', 'Copper Gate', 'Pilgrim Way', 'Anchor Point', 'Thistle Row', 'Brewery Court', 'Clocktower', 'Willow Bank', 'Mason Yard',
  'Garden Terrace', 'Almshouse Lane', 'Drover Square', 'Ferry Landing', 'Vine Walk', 'Park Crescent', 'Sutler Row', 'Chandler Quay', 'Elm Parade', 'Hawthorn Gate',
]

const margin = 26
const clearance = 30

const place = (district: District, taken: { x: number; y: number }[]) => {
  for (;;) {
    const x = district.x + margin + Math.random() * (district.width - 2 * margin)
    const y = district.y + 46 + Math.random() * (district.height - 46 - margin)
    if (taken.every(pin => Math.hypot(pin.x - x, pin.y - y) > clearance)) return { x: Math.round(x), y: Math.round(y) }
  }
}

const clock = (minutes: number) => {
  const hour = Math.floor(minutes / 60)
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`
}

const times = (minutes: number) => {
  const hour = Math.floor(minutes / 60)
  const minute = String(minutes % 60).padStart(2, '0')
  const twelve = `${hour % 12 || 12}:${minute}${hour < 12 ? 'am' : 'pm'}`
  return [twelve, `${String(hour).padStart(2, '0')}:${minute}`, `${hour}:${minute}`, ...(minute === '00' ? [`${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`] : [])]
}

const slot = (from: number, to: number) => (from + Math.floor(Math.random() * ((to - from) / 30 + 1)) * 30)

const saturdays = new Set<string>()
const hoursOf = () => {
  for (;;) {
    const open = slot(7 * 60 + 30, 11 * 60)
    const close = slot(14 * 60, 19 * 60 + 30)
    const key = `${open}-${close}`
    if (!saturdays.has(key)) {
      saturdays.add(key)
      return { open, close }
    }
  }
}

const pool = shuffled(names)
const pins: { id: number; name: string; district: string; x: number; y: number; weekday: string; saturday: { open: number; close: number }; sunday: string }[] = []
for (const district of districts) {
  const here: { x: number; y: number }[] = []
  for (let count = 0; count < district.pins; count++) {
    const spot = place(district, here)
    here.push(spot)
    const saturday = hoursOf()
    pins.push({
      id: pins.length + 1,
      name: pool[pins.length]!,
      district: district.name,
      ...spot,
      weekday: `${clock(slot(7 * 60, 10 * 60))} – ${clock(slot(17 * 60, 20 * 60))}`,
      saturday,
      sunday: Math.random() < 0.5 ? 'Closed' : `${clock(slot(10 * 60, 12 * 60))} – ${clock(slot(15 * 60, 17 * 60))}`,
    })
  }
}

const wanted = pick(pins)
const twin = pick(pins.filter(pin => pin.district !== wanted.district))
twin.name = wanted.name

const hoursText = (pin: (typeof pins)[number]) => `${clock(pin.saturday.open)} – ${clock(pin.saturday.close)}`

const data = JSON.stringify(
  pins.map(pin => ({ id: pin.id, name: pin.name, hours: [['Monday to Friday', pin.weekday], ['Saturday', hoursText(pin)], ['Sunday', pin.sunday]] })),
)

const shapes = districts
  .map(district => `<rect x="${district.x}" y="${district.y}" width="${district.width}" height="${district.height}" fill="${district.fill}" stroke="#fff" stroke-width="6"/>`)
  .join('')

const labels = districts
  .map(district => `<text x="${district.x + 18}" y="${district.y + 32}" font-size="15" font-weight="700" letter-spacing="2" fill="#5a6270">${district.name.toUpperCase()}</text>`)
  .join('')

const streets = `<path d="M0 150 H820 M0 460 H820 M150 0 V600 M430 0 V600 M690 0 V600" stroke="#fff" stroke-width="10" fill="none" opacity=".8"/>
<path d="M-10 250 C 180 300, 330 200, 470 290 S 700 400, 830 330" stroke="#a9cde3" stroke-width="22" fill="none" opacity=".85"/>
<rect x="320" y="120" width="70" height="46" rx="6" fill="#cfe3bd"/><rect x="40" y="480" width="80" height="50" rx="6" fill="#cfe3bd"/>`

const dots = pins.map(pin => `<circle class="pin" data-id="${pin.id}" cx="${pin.x}" cy="${pin.y}" r="5" fill="#d6372f" stroke="#fff" stroke-width="1.5"/>`).join('')

const style = `<style>
.layout { display: flex; gap: 16px; padding: 24px; align-items: flex-start; }
svg { background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; flex: none; }
.pin { cursor: pointer; }
.pin.on { stroke: #1d2330; stroke-width: 2; }
aside { width: 340px; background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; padding: 16px 20px; min-height: 200px; }
#tip { position: fixed; pointer-events: none; background: #1d2330; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 13px; display: none; white-space: nowrap; }
</style>`

const script = `const stores = ${data}
const tip = document.getElementById('tip')
const panel = document.getElementById('panel')
for (const pin of document.querySelectorAll('.pin')) {
  const store = stores.find(each => each.id === Number(pin.dataset.id))
  pin.onmouseenter = event => { tip.textContent = store.name; tip.style.display = 'block'; tip.style.left = event.clientX + 12 + 'px'; tip.style.top = event.clientY + 12 + 'px' }
  pin.onmousemove = event => { tip.style.left = event.clientX + 12 + 'px'; tip.style.top = event.clientY + 12 + 'px' }
  pin.onmouseleave = () => { tip.style.display = 'none' }
  pin.onclick = () => {
    for (const other of document.querySelectorAll('.pin')) other.classList.toggle('on', other === pin)
    panel.innerHTML = '<h2>' + store.name + '</h2><p>Opening hours</p><table>' + store.hours.map(([day, hours]) => '<tr><th>' + day + '</th><td>' + hours + '</td></tr>').join('') + '</table>'
  }
}`

const page = layout(
  'Store finder',
  `${style}<header><b>Fernhill Home &amp; Garden</b><span>Store finder</span></header>
<div class="layout"><svg width="820" height="600" viewBox="0 0 820 600">${shapes}${streets}${labels}${dots}</svg>
<aside><div id="panel"><h2>Our stores</h2><p>Select a store on the map to see its opening hours.</p></div></aside></div>
<div id="tip"></div>`,
  script,
)

export const storeMap: LocalTask = {
  id: 'store-map',
  set: 'browser',
  place: 'local',
  kind: 'tiny',
  prompt: site =>
    `Open the store finder at ${site}/store-map/. Find the store "${wanted.name}" in the ${wanted.district} district (another store elsewhere has the same name), and reply with its Saturday opening hours.`,
  check: seen => all(answered(seen, ...times(wanted.saturday.open)), answered(seen, ...times(wanted.saturday.close))),
  page: path => (path === '/' ? page : undefined),
}
