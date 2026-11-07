import { z } from 'zod'
import { all, type LocalTask, type Seen, type Verdict } from '../task'
import { digits, layout, pick, shuffled } from './layout'

interface Line {
  item: string
  description: string
  qty: number
  cents: number
}

const vendors = ['Halvorsen Office Supply', 'Brightwell Packaging Co.', 'Northfield Hardware', 'Corvid Print & Design', 'Meridian Lab Equipment', 'Tamarind Provisions Ltd']

const catalog = [
  'Copy paper A4, 5 reams',
  'Ballpoint pens, box 50',
  'Stapler, heavy duty',
  'Binder clips, 32 mm',
  'Whiteboard markers',
  'Desk lamp, LED',
  'USB-C cable, 2 m',
  'HDMI cable, 3 m',
  'Wireless mouse',
  'Laptop stand',
  'Monitor arm, dual',
  'Ethernet cable, 10 m',
  'Label printer tape',
  'Sticky notes, 12 pad',
  'Toner cartridge, black',
  'Toner cartridge, cyan',
  'Shipping labels, 500',
  'Packing tape, 6 roll',
  'Bubble wrap, 50 m',
  'Cardboard boxes, 20',
  'Document shredder',
  'Hand sanitizer, 1 L',
  'Coffee beans, 1 kg',
  'Paper cups, 200',
]

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const between = (low: number, high: number) => low + Math.floor(Math.random() * (high - low + 1))

const pad = (value: number) => String(value).padStart(2, '0')

const money = (cents: number) => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')

const vendor = pick(vendors)
const number = `INV-${digits(6)}`
const order = `PO-${digits(5)}`
const month = between(0, 11)
const day = between(1, 24)
const iso = `2025-${pad(month + 1)}-${pad(day)}`
const monthName = months[month] ?? ''
const printed = `${day} ${monthName} 2025`
const received = `${day + between(2, 4)} ${monthName.toUpperCase()} 2025`

const lines: Line[] = shuffled(catalog)
  .slice(0, between(8, 10))
  .map(description => ({ item: `${pick(['AX', 'BR', 'KT'])}-${digits(4)}`, description, qty: between(1, 48), cents: between(185, 24999) }))

const total = lines.reduce((sum, line) => sum + line.qty * line.cents, 0)

type Style = Record<string, string | number>

const text = (x: number, y: number, content: string, ...styles: Style[]) =>
  `<text x="${x}" y="${y}"${[...new Map(styles.flatMap(style => Object.entries(style)))].map(([name, value]) => ` ${name}="${value}"`).join('')}>${escape(content)}</text>`

const mono: Style = { 'font-family': 'Courier New, monospace', 'font-size': 14, fill: '#1b1b1b' }
const small: Style = { 'font-family': 'Arial, sans-serif', 'font-size': 11, fill: '#666' }
const label: Style = { 'font-family': 'Arial, sans-serif', 'font-size': 12, fill: '#555' }
const head: Style = { 'font-family': 'Arial, sans-serif', 'font-size': 11, 'font-weight': 'bold', fill: '#444', 'letter-spacing': 1 }
const serif: Style = { 'font-family': 'Georgia, serif', fill: '#222' }
const stamp: Style = { 'font-family': 'Arial, sans-serif', 'font-weight': 'bold', 'text-anchor': 'middle', stroke: 'none' }
const bold: Style = { 'font-weight': 'bold' }
const end: Style = { 'text-anchor': 'end' }

const rowY = (index: number) => 324 + index * 29
const lastY = rowY(lines.length - 1)

const scan = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="680" viewBox="0 0 600 680">
<defs><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${between(1, 99)}"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0"/></filter></defs>
<rect width="600" height="680" fill="#e4e1d6"/>
<g transform="rotate(-1.3 300 340)">
<rect x="14" y="14" width="572" height="652" fill="#fdfcf6"/>
${text(40, 66, vendor, serif, { 'font-size': 22 }, bold)}
${text(40, 88, '214 Alder Row, Suite 9', small)}
${text(40, 104, 'Tel 555-0142 · Tax ID 48-2210937', small)}
${text(560, 72, 'INVOICE', serif, end, { 'font-size': 30, 'letter-spacing': 4, fill: '#444' })}
${text(40, 150, 'Invoice No.', label)}${text(140, 150, number, mono, bold)}
${text(40, 172, 'Invoice date', label)}${text(140, 172, printed, mono, bold)}
${text(40, 194, 'PO No.', label)}${text(140, 194, order, mono)}
${text(40, 216, 'Terms', label)}${text(140, 216, 'Net 30', mono)}
${text(340, 150, 'Bill to', label)}${text(340, 170, 'Larkspur Studio Ltd', mono)}${text(340, 188, '88 Quay Street', mono)}
<g transform="translate(455 246) rotate(-11)" opacity="0.72" fill="none" stroke="#b3261e"><rect x="-72" y="-22" width="144" height="44" stroke-width="3"/>
${text(0, -2, 'RECEIVED', stamp, { 'font-size': 17, fill: '#b3261e' })}
${text(0, 14, received, stamp, { 'font-size': 11, 'font-weight': 'normal', fill: '#b3261e' })}</g>
${text(40, 292, 'ITEM', head)}${text(116, 292, 'DESCRIPTION', head)}${text(385, 292, 'QTY', head, end)}${text(470, 292, 'UNIT PRICE', head, end)}${text(562, 292, 'AMOUNT', head, end)}
<line x1="40" y1="300" x2="562" y2="300" stroke="#444" stroke-width="1.5"/>
${lines
  .map(
    (line, index) =>
      `${text(40, rowY(index), line.item, mono, { fill: '#777' })}${text(116, rowY(index), line.description, mono)}${text(385, rowY(index), String(line.qty), mono, end)}${text(470, rowY(index), money(line.cents), mono, end)}${text(562, rowY(index), money(line.qty * line.cents), mono, end)}`,
  )
  .join('\n')}
<line x1="40" y1="${lastY + 14}" x2="562" y2="${lastY + 14}" stroke="#444" stroke-width="1"/>
${text(380, lastY + 42, 'TOTAL USD', head, { 'font-size': 13 })}${text(562, lastY + 42, money(total), mono, bold, end, { 'font-size': 17 })}
<g transform="translate(262 240) rotate(7)" opacity="0.6" fill="none" stroke="#1d4f9c"><rect x="-62" y="-18" width="124" height="36" stroke-width="2.5" rx="4"/>${text(0, 6, 'APPROVED', stamp, { 'font-size': 16, fill: '#1d4f9c' })}</g>
${text(40, 652, 'Please remit within 30 days of the invoice date.', small)}
${text(560, 660, 'Page 1 of 1', small, end)}
</g>
<rect width="600" height="680" filter="url(#grain)" opacity="0.25"/>
</svg>`

const css = `<style>
.wrap { display: flex; gap: 24px; align-items: flex-start; padding: 12px 24px; } .scan { position: sticky; top: 12px; width: 600px; height: 680px; flex: none; box-shadow: 0 2px 14px rgba(0,0,0,.28); }
.entry { flex: 1; min-width: 0; background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; padding: 16px 20px 20px; } .entry h1 { margin: 0 0 4px; font-size: 22px; } .entry h2 { font-size: 16px; margin: 20px 0 6px; }
.entry input[type=text] { max-width: none; } .entry label { margin: 10px 0 3px; font-size: 14px; color: #3c4658; }
.entry td { padding: 4px; border: 0; } .entry th { border: 0; font-size: 12px; color: #6a7384; } .entry table { background: none; } .entry tr.row { border-top: 1px solid #e6e9ef; }
.entry td input { width: 100%; padding: 6px; box-sizing: border-box; } .sum { text-align: right; white-space: nowrap; } .gone { border: 0; background: none; color: #9aa3b2; cursor: pointer; font-size: 18px; }
.btn { background: #fff; border: 1px solid #2155c4; color: #2155c4; border-radius: 6px; padding: 7px 14px; cursor: pointer; } .primary { background: #2155c4; color: #fff; }
#status { margin-left: 12px; color: #17803f; }
</style>`

const script = `const rows = document.getElementById('rows')
const money = value => '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const amount = row => {
  const qty = Number(row.querySelector('.qty').value)
  const price = Number(row.querySelector('.price').value)
  return row.querySelector('.qty').value.trim() && row.querySelector('.price').value.trim() && !Number.isNaN(qty * price) ? qty * price : 0
}
const refresh = () => {
  let total = 0
  ;[...rows.children].forEach((row, index) => {
    row.querySelector('.desc').name = 'description' + index
    row.querySelector('.qty').name = 'qty' + index
    row.querySelector('.price').name = 'price' + index
    row.querySelector('.desc').setAttribute('aria-label', 'Description ' + (index + 1))
    row.querySelector('.qty').setAttribute('aria-label', 'Quantity ' + (index + 1))
    row.querySelector('.price').setAttribute('aria-label', 'Unit price ' + (index + 1))
    row.querySelector('.gone').setAttribute('aria-label', 'Remove line ' + (index + 1))
    row.querySelector('.sum').textContent = money(amount(row))
    total += amount(row)
  })
  document.getElementById('total').textContent = money(total)
  document.getElementById('status').textContent = ''
}
document.getElementById('add').onclick = () => {
  const row = document.createElement('tr')
  row.className = 'row'
  row.innerHTML = '<td><input type="text" class="desc" autocomplete="off"></td><td style="width:64px"><input type="text" class="qty" inputmode="numeric" autocomplete="off"></td><td style="width:96px"><input type="text" class="price" inputmode="decimal" autocomplete="off"></td><td class="sum" style="width:92px"></td><td style="width:30px"><button type="button" class="gone">×</button></td>'
  row.oninput = refresh
  row.querySelector('.gone').onclick = () => { row.remove(); refresh() }
  rows.append(row)
  refresh()
  row.querySelector('.desc').focus()
}
document.getElementById('save').onclick = () => {
  const draft = {
    vendor: document.getElementById('vendor').value,
    number: document.getElementById('number').value,
    date: document.getElementById('date').value,
    lines: [...rows.children].map(row => ({ description: row.querySelector('.desc').value, qty: row.querySelector('.qty').value, price: row.querySelector('.price').value })),
  }
  document.getElementById('draft').value = JSON.stringify(draft)
  document.getElementById('status').textContent = 'Draft saved'
}
refresh()`

const page = layout(
  'New expense - Ledgerly',
  `${css}<div class="wrap"><img class="scan" alt="Scanned invoice" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(scan)}">
<form class="entry" onsubmit="return false"><h1>New expense</h1><div style="color:#6a7384;font-size:14px">Enter the invoice from the scan.</div>
<label for="vendor">Vendor</label><input type="text" id="vendor" name="vendor" autocomplete="off">
<label for="number">Invoice number</label><input type="text" id="number" name="number" autocomplete="off">
<label for="date">Invoice date</label><input type="text" id="date" name="date" placeholder="YYYY-MM-DD" autocomplete="off">
<h2>Line items</h2>
<table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th class="sum">Amount</th><th></th></tr></thead><tbody id="rows"></tbody>
<tfoot><tr><td colspan="3" style="text-align:right"><b>Total</b></td><td class="sum"><b id="total"></b></td><td></td></tr></tfoot></table>
<p><button type="button" class="btn" id="add">Add line</button></p>
<p><button type="button" class="btn primary" id="save">Save draft</button><span id="status"></span></p>
<input type="hidden" name="draft" id="draft" value=""></form></div>`,
  script,
)

const draftShape = z.object({
  vendor: z.string(),
  number: z.string(),
  date: z.string(),
  lines: z.array(z.object({ description: z.string(), qty: z.string(), price: z.string() })),
})

const same = (what: string, entered: string, wanted: string): Verdict =>
  entered.trim() === wanted ? { pass: true, why: `${what} ok` } : { pass: false, why: `${what} is "${entered.trim()}", wanted "${wanted}"` }

const lineVerdict = (entered: z.infer<typeof draftShape>['lines'][number] | undefined, line: Line, index: number): Verdict => {
  if (!entered) return { pass: false, why: `line ${index + 1} missing` }
  const ok = entered.description.trim() === line.description && Number(entered.qty) === line.qty && Math.round(Number(entered.price) * 100) === line.cents
  return ok
    ? { pass: true, why: `line ${index + 1} ok` }
    : { pass: false, why: `line ${index + 1} is "${entered.description}" x ${entered.qty} @ ${entered.price}, wanted "${line.description}" x ${line.qty} @ ${money(line.cents)}` }
}

const saved = ({ tabs }: Seen): Verdict => {
  const raw = tabs.find(tab => /\/invoice-entry\//.test(tab.url))?.fields.draft
  if (typeof raw !== 'string' || !raw) return { pass: false, why: 'draft was never saved' }
  const parsed = draftShape.safeParse(JSON.parse(raw))
  if (!parsed.success) return { pass: false, why: 'draft is malformed' }
  const draft = parsed.data
  return all(
    same('vendor', draft.vendor, vendor),
    same('invoice number', draft.number, number),
    same('date', draft.date, iso),
    draft.lines.length === lines.length ? { pass: true, why: 'line count ok' } : { pass: false, why: `${draft.lines.length} lines saved, wanted ${lines.length}` },
    ...lines.map((line, index) => lineVerdict(draft.lines[index], line, index)),
  )
}

export const invoiceEntry: LocalTask = {
  id: 'invoice-entry',
  set: 'browser',
  place: 'local',
  kind: 'flow',
  prompt: site =>
    `At ${site}/invoice-entry/ a scanned vendor invoice is shown next to a new-expense form. Enter the invoice exactly as printed: the vendor, the invoice number, the invoice date as YYYY-MM-DD, and every line item in the printed order (description, quantity and unit price; add a row with "Add line"). Then press "Save draft". The form's total should match the total on the invoice.`,
  check: saved,
  page: path => (path === '/' ? page : undefined),
}
