import { delayed, div, icon, iconButton, segmented, show, span, spinner, type Child, type Sig } from '@sand/dom'
import type { View } from '../prefs'
import { rangeLabels, ranges, type Range } from '../range'

export interface ToolbarProps {
  view: Sig<View>
  range: Sig<Range>
  busy: Sig<boolean>
  caption: () => string
  refresh(): void
}

const viewChoices: { value: View; label: string }[] = [
  { value: 'cost', label: 'Cost' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'limits', label: 'Limits' },
]

const rangeChoices = ranges.map(value => ({ value, label: rangeLabels[value] }))

const refreshButton = ({ view, busy, refresh }: ToolbarProps): Child => {
  const waiting = delayed(busy)
  return iconButton(
    { size: 'sm', title: () => (view.get() === 'limits' ? 'Check limits' : 'Reload usage'), onClick: refresh, disabled: busy },
    show(waiting, () => spinner()),
    show(waiting.map(shown => !shown), () => icon('reload', 13)),
  )
}

export const toolbar = (props: ToolbarProps) =>
  div(
    { class: 'flex flex-wrap items-center gap-2' },
    span({ class: 'mr-auto text-xs text-neutral-500 tabular-nums' }, props.caption),
    segmented(viewChoices, props.view, value => props.view.set(value), { label: 'Usage view' }),
    div(
      { class: ['transition', () => (props.view.get() === 'limits' ? 'pointer-events-none opacity-50' : '')] },
      segmented(rangeChoices, props.range, value => props.range.set(value), { label: 'Period' }),
    ),
    refreshButton(props),
  )
