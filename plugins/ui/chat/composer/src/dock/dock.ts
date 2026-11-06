import { div, dynamicChild, type Child } from '@vaakx-dev/vrui'
import { completionView } from '../complete/view'
import { failureBanner } from '../errors/banners'
import { publishHeight } from '../integrations/measure'
import type { Card, CardParts } from './card'
import { bannerPanel, completionPopup } from './glass'
import { tab } from './tab'

export const dock = ({ ctx, model, slots }: CardParts, card: Card, ...banners: Child[]) => {
  const completing = () => card.completion.visible.get()
  const completions = completionPopup(() => !completing(), ...completionView(ctx.kit, card.completion))
  const view = div(
    { class: 'pointer-events-none relative z-10 shrink-0 px-3 pt-12 pb-3 md:px-4', style: { marginTop: 'calc(-1 * var(--dock-h, 0px))' } },
    div(
      { class: 'pointer-events-auto relative mx-auto w-full max-w-3xl' },
      slots.host('above', 'flex flex-col'),
      div({ class: 'relative flex flex-col', hidden: completing }, slots.host('banner', 'contents', bannerPanel), failureBanner(ctx, model), ...banners),
      div(
        { class: 'relative', onMount: () => ctx.kit.onPressOutside(completions, card.completion.close, [completions, card.editor.node]) },
        completions,
        tab(slots, completing),
        div({ class: 'relative z-10' }, card.node),
      ),
    ),
    dynamicChild(model.shelf, shelf => shelf?.drops(() => view.parentElement) ?? null),
  )
  publishHeight(view, '--dock-h')
  return view
}
