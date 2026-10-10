import type { Entry } from '@sand/messages'

interface FormatStep {
  to: number
  entry(entry: Entry): Entry | null
}

const steps: FormatStep[] = []

export const current = 1 + steps.length

const applyStep = (entries: Entry[], step: FormatStep, dropped: Map<string, string | null>) =>
  entries.flatMap(entry => {
    const next = step.entry(entry)
    if (!next) dropped.set(entry.id, entry.parent)
    return next ? [next] : []
  })

export const upgradeAll = (entries: Entry[], from: number) => {
  const dropped = new Map<string, string | null>()
  const resolve = (id: string | null) => {
    while (id && dropped.has(id)) id = dropped.get(id) ?? null
    return id
  }
  const kept = steps.filter(step => step.to > from).reduce((list, step) => applyStep(list, step, dropped), entries)
  return { entries: dropped.size ? kept.map(entry => ({ ...entry, parent: resolve(entry.parent) })) : kept, resolve }
}

export const upgrade = (entries: Entry[], from: number) => upgradeAll(entries, from).entries
