import { all, answered, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, shuffled } from './layout'

const prefixes = ['Acme', 'Borealis', 'Cobalt', 'Delta', 'Ember', 'Falcon', 'Granite', 'Harbor', 'Indigo', 'Juniper', 'Keystone', 'Lumen']
const suffixes = ['Logistics', 'Foods', 'Labs', 'Energy', 'Media']
const names = shuffled(prefixes.flatMap(prefix => suffixes.map(suffix => `${prefix} ${suffix}`)))

const months = Array.from({ length: 26 }, (_, index) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index % 12]} ${23 + Math.floor(index / 12)}`)

const grid = names.map(() => months.map(() => 1000 + Math.floor(Math.random() * 9000)))

const between = (from: number, to: number) => from + Math.floor(Math.random() * (to - from + 1))

const target = { row: between(40, 56), column: between(17, 24), value: between(1000, 9999) }
const lookup = { row: between(28, 38), column: between(11, 16) }
const targetRow = grid[target.row]!
if (targetRow[target.column] === target.value) targetRow[target.column] = target.value + 1

const rowKey = (index: number) => `row-${index}`

const expected = grid.map((cells, row) => (row === target.row ? cells.map((cell, column) => (column === target.column ? target.value : cell)) : cells))

const page = layout(
  'Revenue sheet',
  `<style>
body { overflow: hidden; } main { max-width: 1180px; padding-top: 12px; } h1 { margin: 0 0 8px; font-size: 20px; }
#selected { height: 28px; font-size: 13px; color: #445; } #panel { height: 440px; overflow: auto; background: #fff; border: 1px solid #c4cad5; }
table { width: max-content; border-collapse: separate; border-spacing: 0; font-size: 13px; }
th, td { border: 0; border-right: 1px solid #e1e5ec; border-bottom: 1px solid #e1e5ec; width: 84px; min-width: 84px; height: 30px; padding: 0 8px; text-align: right; box-sizing: border-box; }
thead th { position: sticky; top: 0; background: #e8ebf0; z-index: 2; } th:first-child, td:first-child { position: sticky; left: 0; width: 180px; min-width: 180px; text-align: left; background: #f1f3f7; z-index: 1; font-weight: 600; }
thead th:first-child { z-index: 3; } td.picked { outline: 2px solid #2155c4; outline-offset: -2px; } td input { width: 100%; height: 100%; border: 0; padding: 0; text-align: right; font: inherit; outline: 2px solid #2155c4; outline-offset: -2px; box-sizing: border-box; }
</style>
<header><b>Ledger</b><span>Revenue by company, in thousands</span></header>
<main><h1>Monthly revenue</h1><div id="selected">Double-click a cell to edit it.</div>
<div id="panel"><table><thead><tr><th>Company</th>${months.map(month => `<th>${month}</th>`).join('')}</tr></thead>
<tbody>${grid.map((cells, row) => `<tr><td>${names[row]}</td>${cells.map((cell, column) => `<td data-row="${row}" data-column="${column}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
${grid.map((cells, row) => `<input type="hidden" name="${rowKey(row)}" value="${cells.join(',')}">`).join('')}</main>`,
  `const names = ${JSON.stringify(names)}
const months = ${JSON.stringify(months)}
const sync = row => {
  const cells = [...document.querySelectorAll('td[data-row="' + row + '"]')].map(cell => cell.textContent)
  document.querySelector('input[name="row-' + row + '"]').value = cells.join(',')
}
const edit = cell => {
  const old = cell.textContent
  const input = document.createElement('input')
  input.value = old
  cell.replaceChildren(input)
  input.focus()
  input.select()
  const finish = save => {
    const text = input.value.trim()
    cell.textContent = save && /^\\d+$/.test(text) ? text : old
    sync(cell.dataset.row)
  }
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') input.blur()
    if (event.key === 'Escape') { input.value = old; input.blur() }
  })
  input.addEventListener('blur', () => finish(true), { once: true })
}
let picked
document.getElementById('panel').addEventListener('click', event => {
  const cell = event.target.closest('td[data-column]')
  if (!cell) return
  picked?.classList.remove('picked')
  picked = cell
  cell.classList.add('picked')
  document.getElementById('selected').textContent = 'Selected: ' + names[cell.dataset.row] + ', ' + months[cell.dataset.column]
})
document.getElementById('panel').addEventListener('dblclick', event => {
  const cell = event.target.closest('td[data-column]')
  if (cell && !cell.querySelector('input')) edit(cell)
})`,
)

const edited = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/sheet\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the sheet is not open' }
  const wrong = expected.flatMap((cells, row) => (tab.fields[rowKey(row)] === cells.join(',') ? [] : [names[row]!]))
  return wrong.length ? { pass: false, why: `rows differ: ${wrong.join(', ')}` } : { pass: true, why: 'only the target cell changed' }
}

export const sheet: LocalTask = {
  id: 'sheet',
  set: 'browser',
  place: 'local',
  kind: 'scroll',
  prompt: site =>
    `Open the revenue sheet at ${site}/sheet/. Set the revenue of ${names[target.row]} for ${months[target.column]} to ${target.value} (double-click the cell, type the number and press Enter). Change nothing else. Then reply with the revenue of ${names[lookup.row]} for ${months[lookup.column]}.`,
  check: seen => all(edited(seen), answered(seen, String(grid[lookup.row]?.[lookup.column]))),
  page: path => (path === '/' ? page : undefined),
}
