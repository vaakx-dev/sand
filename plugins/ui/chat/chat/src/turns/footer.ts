import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { TurnFooter, TurnInfo } from '../parts/contract'
import { row, type RowContext } from '../rows/row'
import type { TurnFoot } from './fold'

const footerViews = (footers: TurnFooter[], turn: TurnInfo) => {
  const views = footers.map(footer => footer.view(turn)).filter(view => view !== null && view !== undefined)
  return views.length ? div(...views) : null
}

export const footRow = (foot: TurnFoot, context: RowContext) =>
  row(foot.key, foot, data => {
    const { thread, device, footers } = context
    const running = data.map(value => value.running)
    const turn = (live: boolean): TurnInfo => ({ session: thread, device, startEntry: foot.entry, running: live })
    return div(
      dynamicChild(
        () => ({ list: footers.list.get(), live: running.get() }),
        ({ list, live }) => footerViews(list, turn(live)),
      ),
    )
  })
