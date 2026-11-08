import type { Kit } from '@sand/ui-kit/contract'
import type { OpenStates, Place, Row, Rows } from '@sand/transcript/contract'
import { div } from '@vaakx-dev/vrui'
import type { Shown, ShownItem } from './fold'
import { turnRow } from './header'

export interface TurnContext {
  kit: Kit
  rows: Rows
  states: OpenStates
  repaint(): void
}

const placed = (inner: Row, place: Place): Row<{ inner: unknown; place: Place }> => ({
  key: inner.key,
  data: { inner: inner.data, place },
  view: data =>
    div(
      { class: () => (data.get().place.railed ? 'flow-root border-l border-neutral-800 pl-3' : '') },
      inner.view(
        data.map(value => value.inner),
        data.map(value => value.place),
      ),
    ),
})

const placeOf = ({ rail, last }: ShownItem): Place => ({ railed: rail, last })

export const shownRows = (entry: Shown, context: TurnContext): Row[] => {
  if (entry.kind === 'turn') return [turnRow(entry, context)]
  return context.rows.item(entry.item).map(inner => placed(inner, placeOf(entry)))
}
