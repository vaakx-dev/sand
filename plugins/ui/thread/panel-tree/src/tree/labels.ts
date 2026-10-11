import type { Entry } from '@sand/messages'

export interface LabelData {
  target: string
  label: string | null
}

export const labelData = (target: string, text: string): LabelData => ({ target, label: text.trim() || null })

export const labelsOf = (entries: Entry[]) => {
  const labels = new Map<string, string>()
  for (const entry of entries) {
    if (entry.type !== 'label') continue
    const { target, label } = entry.data as LabelData
    if (label) labels.set(target, label)
    else labels.delete(target)
  }
  return labels
}
