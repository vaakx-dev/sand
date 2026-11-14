import type { BotEntry, RunEntry } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import { NOTHING } from './runs'

const runNote = (kit: Kit, { id, data }: Pick<BotEntry, 'id' | 'data'>) => {
  const { title, outcome, summary } = data as RunEntry
  const mark = outcome === 'needs' ? kit.stateIcon('waiting', 'sm', true) : kit.icon('list-checks', 'sm')
  const text = outcome === 'nothing' ? NOTHING : summary
  return div({ class: 'my-3 flex items-center gap-2 text-neutral-400', 'data-entry': id }, mark, kit.metaLine(`${title} · ${text}`))
}

export { runNote }
