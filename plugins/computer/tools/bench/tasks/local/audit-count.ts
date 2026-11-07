import { all, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, pick, shuffled } from './layout'

type Status = 'Paid' | 'Overdue' | 'Draft' | 'Void'

interface Invoice {
  customer: string
  status: Status
  cents: number
  due: string
}

const customers = [
  'Alder & Finch',
  'Brightwater Dental',
  'Cobalt Freight',
  'Dunmore Bakery',
  'Eastgate Realty',
  'Fernhill Farms',
  'Granite Peak Gear',
  'Harbor Light Cafe',
  'Ironwood Studio',
  'Juniper Labs',
  'Kestrel Aviation',
  'Lantern Books',
  'Maple Row Clinic',
  'Northwind Cycles',
  'Orchard Lane Press',
  'Pinecrest Hotel',
  'Quarry Stone Co.',
  'Redfern Logistics',
  'Saltmarsh Seafood',
  'Tidewater Marine',
  'Umber Design',
  'Vantage Optics',
  'Willow & Oak',
  'Yarrow Pharmacy',
  'Zenith Electric',
  'Ashby Tools',
  'Birchwood Joinery',
  'Copperfield Tea',
  'Delta Ridge Farms',
  'Emberly Candles',
]

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const between = (low: number, high: number) => low + Math.floor(Math.random() * (high - low + 1))

const cents = (low: number, high: number) => between(low * 100, high * 100 - 1)

const money = (value: number) => `$${(value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const invoice = (status: Status, amount: number): Invoice => ({
  customer: pick(customers),
  status,
  cents: amount,
  due: `${months[between(0, 11)]} ${between(1, 28)}, 2025`,
})

const others: Status[] = ['Paid', 'Paid', 'Paid', 'Overdue', 'Draft', 'Void']
const closed: Status[] = ['Paid', 'Draft', 'Void']

const matches = Array.from({ length: between(9, 14) }, () => invoice('Overdue', cents(5001, 9800)))
matches[0] = invoice('Overdue', 500001)

const nearMisses = [
  invoice('Overdue', 499950),
  invoice('Overdue', 500000),
  ...Array.from({ length: 8 }, () => invoice('Overdue', cents(4900, 5000))),
  ...Array.from({ length: 60 }, () => invoice(pick(closed), cents(5000, 9800))),
]

const filler = Array.from({ length: 400 - matches.length - nearMisses.length }, () => {
  const status = pick(others)
  return invoice(status, status === 'Overdue' ? cents(60, 4900) : cents(60, 9800))
})

const invoices = shuffled([...matches, ...nearMisses, ...filler])

const count = matches.length
const sum = matches.reduce((total, each) => total + each.cents, 0) / 100

const body = invoices
  .map(
    (each, index) =>
      `<tr><td class="num">INV-${2001 + index}</td><td>${each.customer.replaceAll('&', '&amp;')}</td><td><span class="badge ${each.status.toLowerCase()}">${each.status}</span></td><td class="amt">${money(each.cents)}</td><td>${each.due}</td></tr>`,
  )
  .join('')

const page = layout(
  'Invoices - Ledgerly',
  `<style>
body { overflow: hidden; height: 100vh; } .top { height: 52px; box-sizing: border-box; background: #1f2a44; color: #fff; display: flex; align-items: center; padding: 0 24px; gap: 28px; } .top b { font-size: 18px; } .top span { opacity: .75; }
.page { padding: 14px 24px 0; } .page h1 { margin: 0 0 10px; font-size: 20px; display: flex; justify-content: space-between; align-items: baseline; } .page h1 small { font-size: 14px; color: #6a7384; font-weight: 400; }
.panel { height: calc(100vh - 52px - 64px); overflow: auto; background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; }
.panel table { border: 0; } .panel td, .panel th { border: 0; border-bottom: 1px solid #e6e9ef; height: 32px; box-sizing: border-box; padding: 0 12px; font-size: 14px; white-space: nowrap; }
.panel th { position: sticky; top: 0; background: #f0f2f6; font-size: 12px; color: #5b6472; text-transform: uppercase; z-index: 1; } .num { color: #6a7384; } .amt, th.amt { text-align: right; font-variant-numeric: tabular-nums; }
.badge { display: inline-block; padding: 1px 9px; border-radius: 10px; font-size: 12px; font-weight: 600; } .paid { background: #dcf3e4; color: #17683a; } .overdue { background: #fde2dd; color: #a3281a; } .draft { background: #e8ebf1; color: #495364; } .void { background: #efe4f5; color: #6b3a86; }
</style><div class="top"><b>Ledgerly</b><span>Billing</span></div>
<div class="page"><h1>All invoices <small>${invoices.length} invoices</small></h1>
<div class="panel"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Status</th><th class="amt">Amount</th><th>Due date</th></tr></thead><tbody>${body}</tbody></table></div></div>`,
)

const figures = ({ answer }: Seen) => (answer.replaceAll(',', '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

const counted = (seen: Seen): Verdict =>
  figures(seen).includes(count) ? { pass: true, why: `counted ${count}` } : { pass: false, why: `answer lacks the count ${count}: "${seen.answer.slice(0, 120)}"` }

const added = (seen: Seen): Verdict =>
  figures(seen).some(value => Math.abs(value - sum) < 0.005)
    ? { pass: true, why: `summed ${sum.toFixed(2)}` }
    : { pass: false, why: `answer lacks the sum ${sum.toFixed(2)}: "${seen.answer.slice(0, 120)}"` }

export const auditCount: LocalTask = {
  id: 'audit-count',
  set: 'browser',
  place: 'local',
  kind: 'scroll',
  prompt: site =>
    `The billing page at ${site}/audit-count/ lists all of a company's invoices in one long table. How many invoices are Overdue and for more than $5,000, and what do those invoices add up to? Reply with the count and the total in dollars.`,
  check: seen => all(counted(seen), added(seen)),
  page: path => (path === '/' ? page : undefined),
}
