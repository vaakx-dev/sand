import type { Row, TurnFooter, TurnInfo } from '@sand/transcript/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { TurnFoot } from './fold'
import type { TurnContext } from './rows'

const footerViews = (footers: TurnFooter[], turn: TurnInfo) => {
  const views = footers.map(footer => footer.view(turn)).filter(view => view !== null && view !== undefined)
  return views.length ? div(...views) : null
}

export const footRow = (foot: TurnFoot, context: TurnContext): Row<TurnFoot> => ({
  key: foot.key,
  data: foot,
  view: data => {
    const { thread, device, parts } = context
    const running = data.map(value => value.running)
    const turn = (live: boolean): TurnInfo => ({ session: thread, device, startEntry: foot.entry, running: live })
    return div(
      dynamicChild(
        () => ({ list: parts.footers.get(), live: running.get() }),
        ({ list, live }) => footerViews(list, turn(live)),
      ),
    )
  },
})
