import { all, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, pick } from './layout'

const first = ['Ada', 'Bruno', 'Chloe', 'Dmitri', 'Elena', 'Farid', 'Grace', 'Hugo', 'Ines', 'Jonas', 'Keiko', 'Liam', 'Mara', 'Nikos', 'Olga', 'Pavel', 'Quinn', 'Rosa', 'Sven', 'Tessa']
const last = ['Andersen', 'Bianchi', 'Castro', 'Dubois', 'Eriksson', 'Fischer', 'Gomez', 'Haas', 'Ivanov', 'Jensen', 'Kowalski', 'Lindqvist', 'Moreau', 'Novak', 'Okafor', 'Petrov', 'Rossi', 'Silva', 'Tanaka', 'Weber']
const statuses = ['Paid', 'Shipped', 'Pending', 'Refunded']
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const days = 548
const start = Date.UTC(2024, 6, 1)
const wantedCount = 8 + Math.floor(Math.random() * 7)

const dateOf = (index: number) => new Date(start + index * 86_400_000)

const stamp = (index: number) => {
  const date = dateOf(index)
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

const busy = pick(Array.from({ length: 150 }, (_, offset) => 200 + offset).filter(index => dateOf(index).getUTCDate() > 14))

const orders = (() => {
  let number = 20000 + Math.floor(Math.random() * 500)
  return Array.from({ length: days }, (_, day) => {
    const count = day === busy ? wantedCount : 4 + Math.floor(Math.random() * 11)
    const minutes = new Set<number>()
    while (minutes.size < count) minutes.add(8 * 60 + Math.floor(Math.random() * 14 * 60))
    return [...minutes]
      .sort((a, b) => a - b)
      .map(minute => {
        number += 1 + Math.floor(Math.random() * 3)
        return {
          number,
          placed: `${stamp(day)} ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
          customer: `${pick(first)} ${pick(last)}`,
          status: pick(statuses),
          cents: 1500 + Math.floor(Math.random() * 90000),
        }
      })
  }).flat()
})()

const wantedDate = dateOf(busy).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const wantedOrders = orders.filter(order => order.placed.startsWith(`${stamp(busy)} `))
const sum = wantedOrders.reduce((total, order) => total + order.cents, 0)
const total = (sum / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })

const rows = orders.map(order => [order.number, order.placed, order.customer, order.status, order.cents])

const page = layout(
  'Orders',
  `<style>
body { overflow: hidden; } main { max-width: 900px; padding-top: 16px; } h1 { margin: 0 0 12px; font-size: 22px; }
.head, .row { display: grid; grid-template-columns: 170px 90px 1fr 100px 110px; align-items: center; padding: 0 12px; box-sizing: border-box; }
.head { background: #e8ebf0; font-weight: 600; font-size: 14px; height: 36px; border: 1px solid #d5d9e0; border-bottom: 0; }
#panel { height: 300px; overflow-y: auto; background: #fff; border: 1px solid #d5d9e0; position: relative; }
#spacer { position: relative; }
.row { position: absolute; left: 0; right: 0; height: 40px; border-bottom: 1px solid #eceff3; font-size: 14px; }
.row:hover { background: #f3f6fb; } .row span:last-child, .head span:last-child { text-align: right; }
</style>
<header><b>Shopkeeper Admin</b><span>Orders</span><span>Customers</span><span>Reports</span></header>
<main><h1>Orders</h1><div class="head"><span>Placed</span><span>Order</span><span>Customer</span><span>Status</span><span>Total</span></div>
<div id="panel" tabindex="0"><div id="spacer"></div></div></main>`,
  `const orders = ${JSON.stringify(rows)}
const height = 40
const panel = document.getElementById('panel')
const spacer = document.getElementById('spacer')
spacer.style.height = orders.length * height + 'px'
const money = cents => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
const render = () => {
  const start = Math.max(0, Math.floor(panel.scrollTop / height) - 2)
  const end = Math.min(orders.length, start + Math.ceil(panel.clientHeight / height) + 5)
  spacer.replaceChildren(...orders.slice(start, end).map(([number, placed, customer, status, cents], index) => {
    const row = document.createElement('div')
    row.className = 'row'
    row.style.top = (start + index) * height + 'px'
    row.innerHTML = '<span>' + placed + '</span><span>#' + number + '</span><span>' + customer + '</span><span>' + status + '</span><span>' + money(cents) + '</span>'
    return row
  }))
}
panel.addEventListener('scroll', render)
render()`,
)

const counted = ({ answer }: Seen): Verdict => {
  const numbers = answer
    .replace(/\d{4}-\d{2}-\d{2}/g, ' ')
    .replace(/\$?\d[\d,]*\.\d+/g, ' ')
    .match(/\d+/g)
  return numbers?.includes(String(wantedCount)) ? { pass: true, why: `counted ${wantedCount}` } : { pass: false, why: `answer lacks the count ${wantedCount}: "${answer.slice(0, 120)}"` }
}

const summed = ({ answer }: Seen): Verdict => {
  const exact = new RegExp(`(?<![\\d.])${total.replace(/,/g, '').replace('.', '\\.')}(?!\\d)`)
  return exact.test(answer.replace(/,/g, '')) ? { pass: true, why: `summed ${total}` } : { pass: false, why: `answer lacks the sum $${total}: "${answer.slice(0, 120)}"` }
}

export const virtualList: LocalTask = {
  id: 'virtual-list',
  set: 'browser',
  place: 'local',
  kind: 'scroll',
  prompt: site => `The orders admin at ${site}/virtual-list/ lists about five thousand orders sorted by the date and time they were placed. Count the orders placed on ${wantedDate} and add up their totals (all statuses count). Reply with the number of orders and the combined total.`,
  check: seen => all(counted(seen), summed(seen)),
  page: path => (path === '/' ? page : undefined),
}
