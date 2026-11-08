import { div, dynamicChild, type Child } from '@vaakx-dev/vrui'
import { completionView } from '../complete/view'
import { failureBanner } from '../errors/banners'
import { bannerRow } from './banner'
import type { Field, FieldParts } from './field'
import { tab } from './tab'

const completionPopup = (hidden: () => boolean, ...children: Child[]) =>
  div({ class: 'absolute inset-x-0 bottom-full z-20 mb-2 max-h-80 overflow-auto rounded-xl bg-neutral-800 p-1 ring-1 ring-neutral-700 animate-fade', hidden }, ...children)

export const dock = ({ ctx, model, slots }: FieldParts, field: Field, ...banners: Child[]) => {
  const completing = () => field.completion.visible.get()
  const completions = completionPopup(() => !completing(), ...completionView(ctx.kit, field.completion))
  const view = div(
    { class: 'shrink-0 pt-2 pb-3' },
    div(
      { class: ['relative px-3 md:px-4', ctx.kit.pageColumn] },
      slots.host('above', 'flex items-center gap-1.5', field.here),
      div({ class: 'flex flex-col', hidden: completing }, slots.host('banner', 'contents', field.here, bannerRow), failureBanner(ctx, model), ...banners),
      tab(ctx.kit, slots, completing, field.here),
      div(
        { class: 'relative', onMount: () => ctx.kit.onPressOutside(completions, field.completion.close, [completions, field.editor.node]) },
        completions,
        field.node,
      ),
    ),
    dynamicChild(model.shelf, shelf => shelf?.drops(() => view.parentElement) ?? null),
  )
  return view
}
