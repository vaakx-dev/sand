import type { UpdateState } from '@sand/protocol'
import { div, dynamicChild, icon, primaryAction, quietButton, span, spinner, type Child } from '@sand/dom'
import type { UpdateSource } from './source'
import { isBusy, progressText, releaseName } from './text'

export const bannerVisible = (state: UpdateState | undefined) => {
  if (!state?.installed) return false
  if (state.phase === 'idle') return state.available && !state.later
  return true
}

const text = (title: string, subtitle?: string) =>
  div(
    { class: 'flex min-w-0 flex-1 items-baseline gap-2' },
    span({ class: 'truncate text-neutral-100' }, title),
    subtitle ? span({ class: 'truncate text-xs text-neutral-400' }, subtitle) : null,
  )

const later = (source: UpdateSource) =>
  quietButton({ size: 'sm', disabled: source.busy, onClick: () => void source.later() }, 'Later')

const update = (source: UpdateSource, label: string) =>
  primaryAction({ size: 'sm', disabled: source.busy, onClick: () => void source.apply() }, label)

const content = (source: UpdateSource, state: UpdateState): Child[] => {
  if (state.phase === 'failed')
    return [text('Could not update sand', state.error), later(source), state.available ? update(source, 'Try again') : null]
  if (isBusy(state)) return [text(progressText(state)), spinner()]
  return [text(`Sand ${releaseName(state)} is available`), later(source), update(source, 'Update')]
}

export const bannerView = (source: UpdateSource) =>
  div(
    { class: 'w-full px-3 pt-2' },
    div(
      {
        role: 'status',
        class: 'flex w-full items-center gap-3 rounded-lg border border-accent-800 bg-accent-950 px-3 py-1 text-sm animate-fade',
      },
      span({ class: 'inline-flex shrink-0 text-accent-400' }, icon('reload', 14)),
      dynamicChild(source.state, state =>
        div({ class: 'flex min-w-0 flex-1 items-center gap-2' }, ...(state ? content(source, state) : [])),
      ),
    ),
  )
