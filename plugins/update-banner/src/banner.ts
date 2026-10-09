import type { UpdateState } from '@sand/protocol'
import { div, icon, primaryAction, quietButton, span, spinner, type Child } from '@sand/dom'
import type { UpdateSource } from './source'

const short = (id: string | undefined) => id?.slice(0, 6) ?? ''

export const bannerVisible = (state: UpdateState | undefined) => {
  if (!state?.installed) return false
  if (state.phase === 'idle') return !!state.offer && !state.later
  if (state.phase === 'failed') return !state.later
  return true
}

const offerSubtitle = (state: UpdateState) => {
  const build = `build ${short(state.offer?.build.id)}`
  return state.current ? `${build} · this PC has ${short(state.current.id)}` : build
}

const progressTitle = (state: UpdateState) => {
  const name = state.offer?.name ?? 'your other PC'
  const build = short(state.offer?.build.id)
  switch (state.phase) {
    case 'downloading':
      return `Downloading sand from ${name}…`
    case 'installing':
      return `Installing build ${build}…`
    case 'switching':
      return `Switching to build ${build}…`
    case 'waiting':
      return 'Sand restarts when running threads finish or time out'
    default:
      return 'Restarting sand…'
  }
}

const text = (title: string, subtitle?: string) =>
  div(
    { class: 'min-w-0 flex-1' },
    div({ class: 'truncate text-neutral-100' }, title),
    subtitle ? div({ class: 'truncate text-xs text-neutral-400' }, subtitle) : null,
  )

const later = (source: UpdateSource) =>
  quietButton({ size: 'sm', disabled: source.busy, onClick: () => void source.later() }, 'Later')

const update = (source: UpdateSource, label: string) =>
  primaryAction({ size: 'sm', disabled: source.busy, onClick: () => void source.apply() }, label)

const content = (source: UpdateSource, state: UpdateState): Child[] => {
  if (state.phase === 'idle')
    return [text(`${state.offer?.name ?? 'Another PC'} has a newer sand`, offerSubtitle(state)), later(source), update(source, 'Update')]
  if (state.phase === 'failed')
    return [text('Could not update sand', state.error), later(source), state.offer ? update(source, 'Try again') : null]
  return [text(progressTitle(state)), spinner()]
}

export const bannerView = (source: UpdateSource) =>
  div(
    { class: 'w-full px-3 pt-3' },
    div(
      {
        role: 'status',
        class: 'flex min-h-12 w-full items-center gap-3 rounded-lg border border-accent-800 bg-accent-950 px-3 py-2 text-sm animate-fade',
      },
      span({ class: 'inline-flex shrink-0 text-accent-400' }, icon('laptop', 16)),
      () => {
        const state = source.state.get()
        return state ? div({ class: 'flex min-w-0 flex-1 items-center gap-3' }, ...content(source, state)) : null
      },
    ),
  )
