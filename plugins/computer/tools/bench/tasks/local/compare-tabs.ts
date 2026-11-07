import { all, answered, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, pick, shuffled } from './layout'

interface Laptop {
  id: number
  name: string
  ram: number
  grams: number
  price: number
}

interface Rate {
  region: string
  base: number
  perKg: number
}

const regions = ['Pacific Northwest', 'Texas', 'New England', 'Great Lakes', 'Alaska']

const rates: Rate[] = regions.map(region => ({ region, base: 500 + 50 * Math.floor(Math.random() * 20), perKg: 1000 + 20 * Math.floor(Math.random() * 60) }))
const rate = pick(rates)

const names = shuffled(['Aero 14', 'Vertex 15', 'Nimbus Air', 'Orion Pro', 'Kestrel 13', 'Atlas 16', 'Zephyr X', 'Lumen 14', 'Falcon S', 'Mirage 15', 'Cobalt Go', 'Ember 16'])

const between = (low: number, high: number, step = 1) => low + step * Math.floor((Math.random() * (high - low)) / step)

const totalOf = (laptop: Laptop) => laptop.price * 100 + rate.base + (laptop.grams * rate.perKg) / 1000

const qualifies = (laptop: Laptop) => laptop.ram >= 16 && laptop.grams < 1500

const draft = (): Laptop[] =>
  shuffled([
    ...Array.from({ length: 4 }, () => ({ ram: pick([16, 32]), grams: between(1000, 1460, 50), price: between(1100, 1160) })),
    { ram: 8, grams: between(1000, 1400, 50), price: between(600, 700) },
    { ram: 32, grams: 1500, price: between(800, 950) },
    { ram: 16, grams: between(1600, 1900, 50), price: between(850, 1050) },
    { ram: 8, grams: between(1900, 2300, 50), price: between(500, 650) },
  ]).map((spec, index) => ({ ...spec, id: index + 1, name: names[index] ?? '' }))

const settled = () => {
  for (;;) {
    const laptops = draft()
    const fit = laptops.filter(qualifies)
    const byTotal = [...fit].sort((a, b) => totalOf(a) - totalOf(b))
    const cheapest = fit.reduce((best, each) => (each.price < best.price ? each : best))
    const [lowest, next] = byTotal
    if (fit.length === 4 && lowest && next && lowest !== cheapest && totalOf(next) - totalOf(lowest) >= 100) return { laptops, winner: lowest }
  }
}

const { laptops, winner } = settled()
const total = (totalOf(winner) / 100).toFixed(2)

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

const visits = `const key = 'compare-tabs-visits'
const visited = JSON.parse(localStorage.getItem(key) ?? '[]')
const mark = id => { if (!visited.includes(id)) { visited.push(id); localStorage.setItem(key, JSON.stringify(visited)) } }
const mirror = () => { document.getElementById('visited').value = visited.join(',') }`

const header = '<header><b>Northline Computers</b><a href="/compare-tabs/">Laptops</a><a href="/compare-tabs/shipping" target="_blank">Shipping rates</a></header>'

const visitedField = '<input type="hidden" name="visited" id="visited" value="">'

const listing = layout(
  'Laptops',
  `${header}<main><h1>Laptops</h1><div class="grid">${laptops
    .map(laptop => `<div class="card"><h3>${laptop.name}</h3><p>Everyday performance for work and travel.</p><a href="/compare-tabs/laptop/${laptop.id}" target="_blank">View specs</a></div>`)
    .join('')}</div>${visitedField}</main>`,
  `${visits}\nmirror()`,
)

const shipping = layout(
  'Shipping rates',
  `${header}<main><h1>Shipping rates</h1><p>Shipping cost = base fee + per-kg rate × the weight of the laptop.</p>
<table><tr><th>Region</th><th>Base fee</th><th>Per kg</th></tr>${rates
    .map(each => `<tr><td>${each.region}</td><td>${money(each.base)}</td><td>${money(each.perKg)}</td></tr>`)
    .join('')}</table>${visitedField}</main>`,
  `${visits}\nmirror()`,
)

const detail = (id: number) => {
  const laptop = laptops.find(each => each.id === id)
  if (!laptop) return undefined
  return layout(
    laptop.name,
    `${header}<main><h1>${laptop.name}</h1><table><tr><th>Memory</th><td>${laptop.ram} GB</td></tr><tr><th>Weight</th><td>${(laptop.grams / 1000).toFixed(2)} kg</td></tr><tr><th>Price</th><td>$${laptop.price.toLocaleString('en-US')}</td></tr></table>
<p><a href="/compare-tabs/">← All laptops</a></p>${visitedField}</main>`,
    `${visits}\nmark(${laptop.id})\nmirror()`,
  )
}

const opened = ({ tabs }: Seen): Verdict =>
  tabs.some(tab => String(tab.fields.visited ?? '').split(',').includes(String(winner.id)))
    ? { pass: true, why: `opened ${winner.name}` }
    : { pass: false, why: `never opened the page of ${winner.name}` }

export const compareTabs: LocalTask = {
  id: 'compare-tabs',
  set: 'browser',
  place: 'local',
  kind: 'tabs',
  prompt: site =>
    `In the laptop shop at ${site}/compare-tabs/, look at the laptops with at least 16 GB of memory that weigh less than 1.5 kg. Which of them has the lowest price including shipping to ${rate.region}? Reply with its name and the total in dollars.`,
  check: seen => all(answered(seen, winner.name), answered(seen, total), opened(seen)),
  page(path) {
    if (path === '/') return listing
    if (path === '/shipping') return shipping
    const match = path.match(/^\/laptop\/(\d+)$/)
    return match ? detail(Number(match[1])) : undefined
  },
}
