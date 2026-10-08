import type { ReportRow } from '@sand/protocol'
import { plural, type DiffLine } from '@sand/kit'
import type { Changes, FileChange } from './collect'
import { shownLines, totals } from './lines'

const marks = { add: '+', del: '-', ctx: ' ' }

const counted = ({ add, del }: { add: number; del: number }) => `+${add} −${del}`

const lineText = (line: DiffLine) => (line.kind === 'gap' ? `⋯ ${line.text}` : `${marks[line.kind]} ${line.text}`)

const fileRow = (file: FileChange): ReportRow => ({
  kind: 'pair',
  label: [file.path, file.agent && `(${file.agent})`, file.outside && '(outside project)'].filter(Boolean).join(' '),
  value: counted(file),
})

export const changesReport = ({ files }: Changes): ReportRow[] => [
  { kind: 'pair', label: plural(files.length, 'file'), value: counted(totals(files)) },
  ...files.map(fileRow),
]

export const fileReport = (file: FileChange): ReportRow[] => [
  fileRow(file),
  { kind: 'text', text: shownLines(file).map(lineText).join('\n'), mono: true },
]
