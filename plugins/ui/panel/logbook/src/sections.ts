import type { Entry } from '@sand/logbook/contract'
import { DAY_MS, dayLabel, grouped, monthLabel } from '@sand/util'

interface Section {
  label: string
  entries: Entry[]
}

const RECENT_DAYS = 30

const headingOf = (at: number, now: number) => (now - at < RECENT_DAYS * DAY_MS ? dayLabel(at) : monthLabel(at))

const sections = (entries: Entry[]) => {
  const now = Date.now()
  const byLabel = new Map<string, Section>()
  for (const entry of entries.toSorted((first, second) => second.at - first.at)) {
    const label = headingOf(entry.at, now)
    grouped(byLabel, label, () => ({ label, entries: [] })).entries.push(entry)
  }
  return [...byLabel.values()]
}

export { sections, type Section }
