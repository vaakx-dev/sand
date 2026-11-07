export const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')

export const percent = (value: number) => `${Math.round(value * 100)}%`

export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

export const heat = (value: number) => `hsl(${Math.round(value * 120)} 55% 32%)`

export const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

export const percentile = (sorted: number[], share: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1)]! : 0)

export interface Cell {
  html: string
  shade?: number
}

export const table = (rows: string[], columns: string[], cellOf: (row: string, column: string) => Cell | undefined) => {
  if (!rows.length) return '<p>No results.</p>'
  const cells = new Map(rows.flatMap(row => columns.map(column => [`${row}\u0000${column}`, cellOf(row, column)] as const)))
  const used = columns.filter(column => rows.some(row => cells.get(`${row}\u0000${column}`)))
  const body = rows.map(row => {
    const shown = used.map(column => {
      const cell = cells.get(`${row}\u0000${column}`)
      if (!cell) return '<td>–</td>'
      return `<td${cell.shade === undefined ? '' : ` style="background:${heat(cell.shade)}"`}>${cell.html}</td>`
    })
    return `<tr><th>${escape(row)}</th>${shown.join('')}</tr>`
  })
  return `<div class="wide"><table><tr><th></th>${used.map(column => `<th>${escape(column)}</th>`).join('')}</tr>${body.join('')}</table></div>`
}

export interface Bar {
  label: string
  value: number
  text: string
}

export const bars = (items: Bar[], max = Math.max(...items.map(item => item.value))) =>
  `<div class="bars">${items
    .map(
      ({ label, value, text }) =>
        `<div class="bar"><span>${escape(label)}</span><span class="track"><i style="width:${max > 0 ? (value / max) * 100 : 0}%;background:${heat(value / (max || 1))}"></i></span><b>${escape(text)}</b></div>`,
    )
    .join('')}</div>`

const style = `body { font: 14px/1.4 system-ui, sans-serif; margin: 0 auto; padding: 16px; max-width: 980px; background: #111418; color: #e6e9ef; }
h1 { font-size: 20px; } h2 { font-size: 16px; margin: 28px 0 8px; } li { margin: 3px 0; } small { opacity: 0.65; font-size: 10px; }
.wide { overflow-x: auto; } table { border-collapse: collapse; font-size: 12px; } td, th { padding: 3px 6px; border: 1px solid #2b313b; text-align: right; white-space: nowrap; } th:first-child { text-align: left; }
.bars { display: grid; gap: 4px; } .bar { display: grid; grid-template-columns: minmax(0, 13rem) minmax(0, 1fr) 5rem; gap: 8px; align-items: center; font-size: 12px; }
.bar span:first-child { overflow-wrap: anywhere; } .track { height: 14px; background: #1c2129; border-radius: 3px; } .track i { display: block; height: 100%; border-radius: 3px; } .bar b { font-weight: 500; text-align: right; }`

export interface Section {
  title: string
  html: string
}

export const page = (title: string, notes: string[], sections: Section[]) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title><style>
${style}
</style></head><body><h1>${escape(title)}</h1><ul>${notes.map(note => `<li>${escape(note)}</li>`).join('')}</ul>
${sections.map(section => `<h2>${escape(section.title)}</h2>${section.html}`).join('\n')}
</body></html>`
