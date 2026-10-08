import type { ReportRow } from '@sand/protocol'

const bar = (fraction: number, width = 24) => {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export const reportText = (title: string, rows: ReportRow[]) => {
  const width = Math.max(0, ...rows.map(row => (row.kind === 'text' ? 0 : row.label.length)))
  const line = (row: ReportRow) => {
    if (row.kind === 'text') return `\n${row.text}`
    if (row.kind === 'bar') return `${row.label.padEnd(width)}  ${bar(row.fraction)}  ${row.value}`
    return `${row.label.padEnd(width)}  ${row.value}`
  }
  return [title, ...rows.map(line)].join('\n')
}
