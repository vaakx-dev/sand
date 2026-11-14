import { type BotEntry, gistEntry, type JobRun, runEntry, type RunEntry } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div } from '@vaakx-dev/vrui'
import { runRows } from './runs'

type Shown = Pick<BotEntry, 'id' | 'at' | 'data'>

const UNSEEN = new Set(['usage', gistEntry])

const quietRun = (entry: BotEntry | undefined, job: string) => {
  const run = entry?.type === runEntry ? (entry.data as RunEntry) : undefined
  return run?.outcome === 'nothing' && run.job === job
}

const runOf = ({ id, at, data }: Shown): JobRun => {
  const { outcome, summary } = data as RunEntry
  return { entry: id, at, outcome, summary }
}

const quietStreak = (entries: BotEntry[], id: string, job: string) => {
  const seen = entries.filter(entry => !UNSEEN.has(entry.type))
  const at = seen.findIndex(entry => entry.id === id)
  if (at < 0 || quietRun(seen[at - 1], job)) return []
  const rest = seen.slice(at)
  const end = rest.findIndex(entry => !quietRun(entry, job))
  return (end < 0 ? rest : rest.slice(0, end)).toReversed()
}

const runNote = (kit: Kit, entry: Shown, entries: () => BotEntry[] | undefined) => {
  const { job, title, outcome, summary } = entry.data as RunEntry
  const mark = outcome === 'needs' ? kit.stateIcon('waiting', 'sm', true) : kit.icon('list-checks', 'sm')
  const streak = derive(() => (outcome === 'nothing' ? quietStreak(entries() ?? [], entry.id, job) : [entry]))
  const text = () => {
    const [row] = runRows(streak.get().map(runOf))
    if (outcome !== 'nothing' || !row) return `${title} · ${summary}`
    return streak.get().length > 1 ? `${title} · ${row.text} · ${row.at}` : `${title} · ${row.text}`
  }
  return div(
    { class: 'my-3 flex items-center gap-2 text-neutral-400', 'data-entry': entry.id, hidden: () => !streak.get().length },
    mark,
    kit.metaLine(text),
  )
}

export { runNote }
