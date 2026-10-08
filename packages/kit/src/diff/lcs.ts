export type DiffKind = 'add' | 'del' | 'ctx' | 'gap'

export interface DiffLine {
  kind: DiffKind
  text: string
}

export const lcsLines = (before: string[], after: string[]): DiffLine[] => {
  const cols = after.length + 1
  const lengths = new Uint32Array((before.length + 1) * cols)
  for (let i = before.length - 1; i >= 0; i--)
    for (let j = after.length - 1; j >= 0; j--)
      lengths[i * cols + j] = before[i] === after[j] ? lengths[(i + 1) * cols + j + 1]! + 1 : Math.max(lengths[(i + 1) * cols + j]!, lengths[i * cols + j + 1]!)
  const lines: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      lines.push({ kind: 'ctx', text: before[i++]! })
      j++
    } else if (i < before.length && (j === after.length || lengths[(i + 1) * cols + j]! >= lengths[i * cols + j + 1]!)) lines.push({ kind: 'del', text: before[i++]! })
    else lines.push({ kind: 'add', text: after[j++]! })
  }
  return lines
}
