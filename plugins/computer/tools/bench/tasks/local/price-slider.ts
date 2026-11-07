import type { LocalTask, Seen, Verdict } from '../task'
import { layout } from './layout'

const multiple = (from: number, to: number) => 5 * (from + Math.floor(Math.random() * (to - from + 1)))

const wanted = { min: multiple(20, 80), max: multiple(120, 190) }

const products = ['Trail runner shoes', 'Insulated bottle', 'Merino base layer', 'Headlamp 400', 'Packable rain shell', 'Camp stove', 'Trekking poles', 'Daypack 28L']

const sidebar = `<aside><h3>Category</h3>
<label><input type="checkbox"> Footwear</label><label><input type="checkbox"> Clothing</label><label><input type="checkbox"> Camping</label>
<h3>Price</h3>
<form action="/price-slider/results">
<div id="range"><div id="bar"></div>
<div class="handle" id="low" tabindex="0" aria-label="Minimum price handle"><span class="value">0</span></div>
<div class="handle" id="high" tabindex="0" aria-label="Maximum price handle"><span class="value">1000</span></div></div>
<input type="hidden" name="min" value="0"><input type="hidden" name="max" value="1000">
<p><button>Apply filter</button></p></form></aside>`

const list = `<div class="grid">${products.map((name, index) => `<div class="card"><div class="photo" style="background:hsl(${index * 41},35%,78%)"></div><b>${name}</b><p>See price in cart</p></div>`).join('')}</div>`

const style = `<style>
main { display: flex; gap: 32px; max-width: 1100px; } aside { width: 380px; flex: none; } section { flex: 1; }
aside label { margin: 4px 0; } .photo { height: 70px; border-radius: 4px; margin-bottom: 8px; } .grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
#range { position: relative; width: 340px; height: 4px; margin: 52px 20px 36px; background: #cfd5df; border-radius: 2px; }
#bar { position: absolute; top: 0; height: 4px; background: #2155c4; }
.handle { position: absolute; top: -8px; width: 20px; height: 20px; margin-left: -10px; border-radius: 50%; background: #fff; border: 2px solid #2155c4; box-sizing: border-box; cursor: pointer; }
.handle:focus { outline: 3px solid #9db8ef; } .value { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%); font-size: 12px; background: #23395d; color: #fff; padding: 1px 6px; border-radius: 4px; }
</style>`

const script = `const range = document.getElementById('range')
const bar = document.getElementById('bar')
const handles = { min: document.getElementById('low'), max: document.getElementById('high') }
const values = { min: 0, max: 1000 }
const render = () => {
  for (const key of ['min', 'max']) {
    handles[key].style.left = values[key] / 10 + '%'
    handles[key].querySelector('.value').textContent = values[key]
    document.querySelector('input[name=' + key + ']').value = values[key]
  }
  bar.style.left = values.min / 10 + '%'
  bar.style.width = (values.max - values.min) / 10 + '%'
}
const move = (key, value) => {
  const limits = key === 'min' ? [0, values.max - 5] : [values.min + 5, 1000]
  values[key] = Math.min(limits[1], Math.max(limits[0], Math.round(value / 5) * 5))
  render()
}
let held
for (const key of ['min', 'max']) {
  handles[key].addEventListener('mousedown', event => {
    event.preventDefault()
    handles[key].focus()
    held = { key, grab: event.clientX - handles[key].getBoundingClientRect().left - 10 }
  })
  handles[key].addEventListener('keydown', event => {
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[event.key]
    if (!step) return
    event.preventDefault()
    move(key, values[key] + step)
  })
}
document.addEventListener('mousemove', event => {
  if (!held) return
  move(held.key, ((event.clientX - held.grab - range.getBoundingClientRect().left) / range.offsetWidth) * 1000)
})
document.addEventListener('mouseup', () => { held = undefined })
render()`

const page = layout('Trailhead Outfitters', `${style}<header><b>Trailhead Outfitters</b><span>Hiking</span><span>Camping</span><span>Sale</span></header><main>${sidebar}<section><h1>Hiking gear</h1>${list}</section></main>`, script)

const applied = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/price-slider\/results\?/.test(tab.url))
  if (!tab) return { pass: false, why: `the filter was not applied; open: ${tabs.map(tab => tab.url).join(', ')}` }
  const query = new URL(tab.url).searchParams
  return query.get('min') === String(wanted.min) && query.get('max') === String(wanted.max)
    ? { pass: true, why: `filtered ${wanted.min}-${wanted.max}` }
    : { pass: false, why: `filtered ${query.get('min')}-${query.get('max')}` }
}

const results = layout(
  'Trailhead Outfitters',
  '<header><b>Trailhead Outfitters</b><span>Hiking</span><span>Camping</span><span>Sale</span></header><main><h1>Hiking gear</h1><p>Filter applied.</p><p><a href="/price-slider/">Back to all products</a></p></main>',
)

export const priceSlider: LocalTask = {
  id: 'price-slider',
  set: 'browser',
  place: 'local',
  kind: 'drag',
  prompt: site => `Open ${site}/price-slider/ and use the price filter to set the range to exactly ${wanted.min} to ${wanted.max}, then press "Apply filter". The range is set with the two slider handles.`,
  check: applied,
  page(path) {
    if (path === '/') return page
    if (path === '/results') return results
    return undefined
  },
}
