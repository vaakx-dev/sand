import type { Entry } from '@sand/messages'
import type { LabelData } from './describe'

export interface Label {
  text: string
  at: number
}

export const labelsOf = (entries: Entry[]) => {
  const labels = new Map<string, Label>()
  for (const entry of entries) {
    if (entry.type !== 'label') continue
    const { target, label } = entry.data as LabelData
    if (label) labels.set(target, { text: label, at: entry.at })
    else labels.delete(target)
  }
  return labels
}
