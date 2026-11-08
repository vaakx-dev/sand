import type { Kit } from '@sand/ui-kit/contract'
import type { OpenStates, Row, Rows, TranscriptParts } from '@sand/transcript/contract'
import { div } from '@vaakx-dev/vrui'
import type { Shown } from './fold'
import { turnRow } from './header'

export interface TurnContext {
  kit: Kit
  parts: TranscriptParts
  rows: Rows
  states: OpenStates
  repaint(): void
}

const railed = (inner: Row, rail: boolean): Row<{ inner: unknown; rail: boolean }> => ({
  key: inner.key,
  data: { inner: inner.data, rail },
  view: data =>
    div(
      { class: () => (data.get().rail ? 'ml-2 flow-root border-l border-neutral-800 pl-3' : '') },
      inner.view(
        data.map(value => value.inner),
        data.map(value => value.rail),
      ),
    ),
})

export const shownRows = (entry: Shown, context: TurnContext): Row[] => {
  if (entry.kind === 'turn') return [turnRow(entry, context)]
  return context.rows.item(entry.item).map(inner => railed(inner, entry.rail))
}
