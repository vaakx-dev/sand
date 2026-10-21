import { div } from '@vaakx-dev/vrui'
import { chatDrop } from '../attachments/drop'
import { completionView } from '../complete/view'
import { errorBanners } from '../errors/banners'
import { parentRect, publishHeight } from '../integrations/measure'
import type { Card, CardParts } from './card'
import { completionPopup } from './glass'
import { tab } from './tab'
import { tray } from './tray'

export const dock = ({ ctx, model, slots, dropping }: CardParts, card: Card) => {
  const completing = () => card.completion.visible.get()
  const completions = completionPopup(() => !completing(), ...completionView(ctx.kit, card.completion))
  const view = div(
    { class: 'pointer-events-none relative z-10 shrink-0 px-3 pt-12 pb-3 md:px-4', style: { marginTop: 'calc(-1 * var(--dock-h, 0px))' } },
    div(
      { class: 'pointer-events-auto relative mx-auto w-full max-w-3xl' },
      div({ class: 'relative flex flex-col', hidden: completing }, ...errorBanners(ctx, model)),
      div(
        { class: 'relative', onMount: () => ctx.kit.onPressOutside(completions, card.completion.close, [completions, card.editor.node]) },
        completions,
        tab(slots, completing),
        div({ class: 'relative z-10' }, card.node),
      ),
      tray(slots),
    ),
    chatDrop(ctx.kit, dropping, () => parentRect(view)),
  )
  publishHeight(view, '--dock-h')
  return view
}
