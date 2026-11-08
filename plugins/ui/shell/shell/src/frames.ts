import { aside, div, header, section, show, span, type Child } from '@vaakx-dev/vrui'
import type { Model } from './model'
import type { Built, Side } from './screens'

const fill = 'flex min-h-0 min-w-0 flex-1 flex-col'

export const bar = (...children: Child[]) =>
  header({ class: 'flex h-12 min-w-0 shrink-0 items-center gap-1 border-b border-neutral-800 px-2' }, ...children)

export const toolButton = (model: Model, label: string, glyph: string, onClick: () => void) =>
  model.kit.iconButton({ title: label, 'aria-label': label, onClick }, model.kit.icon(glyph))

const sideFrame = (model: Model, kind: string, side: Side) =>
  aside(
    { 'aria-label': side.label, class: 'flex min-h-0 min-w-0 shrink-0 flex-col border-l border-neutral-800', style: { width: '42%' } },
    bar(
      span({ class: 'ml-2 min-w-0 flex-1 truncate text-sm text-neutral-400' }, side.label),
      side.actions ?? null,
      toolButton(model, `Hide ${side.label}`, 'panel', () => model.showSide(kind, false)),
    ),
    div({ class: fill }, side.body),
  )

export const deskFrames = (model: Model, built: Built) => {
  const kind = built.spec.kind
  const side = built.side
  const sideShown = () => Boolean(side) && !model.sideHidden(kind)
  return div(
    { class: 'flex min-h-0 min-w-0 flex-1' },
    section(
      { class: fill },
      bar(
        show(
          () => model.state.get() === 'drawer',
          () => toolButton(model, 'Show the sidebar', 'sidebar', () => model.setDrawer(true)),
        ),
        built.head,
        side
          ? show(
              () => !sideShown(),
              () => toolButton(model, `Show ${side.label}`, 'panel', () => model.showSide(kind, true)),
            )
          : null,
      ),
      div({ class: fill }, built.main),
    ),
    side ? show(sideShown, () => sideFrame(model, kind, side)) : null,
  )
}

const sideSwitch = (model: Model, built: Built, side: Side) =>
  model.kit.segmented<'main' | 'side'>(
    [
      { value: 'main', label: side.mainLabel },
      { value: 'side', label: side.label },
    ],
    built.showing,
    value => built.showing.set(value),
    { label: 'Show', class: 'shrink-0 flex-nowrap' },
  )

export const phoneFrame = (model: Model, built: Built) => {
  const side = built.side
  const mainShown = () => built.showing.get() === 'main'
  const sideShown = () => built.showing.get() === 'side'
  const visible = (when: () => boolean) => () => (when() ? fill : 'hidden')
  return section(
    { class: fill },
    bar(
      toolButton(model, 'Back', 'back', () => model.back()),
      built.head,
      side ? show(sideShown, () => side.actions ?? null) : null,
      side ? sideSwitch(model, built, side) : null,
    ),
    side ? div({ class: visible(mainShown) }, built.main) : div({ class: fill }, built.main),
    side ? div({ class: visible(sideShown) }, side.body) : null,
  )
}
