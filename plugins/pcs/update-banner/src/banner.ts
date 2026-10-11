import { derive, div, dynamicChild, icon, okMark, primaryAction, quietButton, span, spinner, type Child } from '@sand/dom'
import { plural } from '@sand/kit'
import { changeLine, isNotable } from './changes'
import type { Fleet } from './fleet/model'
import { changesFor, isFar } from './fleet/status'
import { behindText } from './fleet/text'
import { statusMark } from './mark'

type BannerKind = 'running' | 'done' | 'failed' | 'ready'

export const bannerKind = (fleet: Fleet) =>
  derive<BannerKind | undefined>(() => {
    if (fleet.run.get()) {
      if (!fleet.runFinished.get()) return 'running'
      return fleet.runRows.get().every(row => row.status.kind === 'done') ? 'done' : 'failed'
    }
    const pending = fleet.pending.get()
    return pending.some(pc => !pc.state?.later) ? 'ready' : undefined
  })

const text = (title: () => string, subtitle?: () => string, warn?: () => boolean) =>
  div(
    { class: 'flex min-w-0 flex-1 flex-col' },
    span({ class: 'truncate text-neutral-100' }, title),
    subtitle ? span({ class: ['truncate text-xs', () => (warn?.() ? 'text-warning-400' : 'text-neutral-400')], title: subtitle }, subtitle) : null,
  )

const readyTitle = (fleet: Fleet) => {
  const pending = fleet.pending.get()
  const name = fleet.target.get()?.name ?? 'sand'
  return pending.length === 1 && pending[0]?.local ? `Sand ${name} is available` : `Update ready for ${plural(pending.length, 'PC')}`
}

const farPc = (fleet: Fleet) => fleet.pending.get().find(pc => isFar(pc.status))

const readySubtitle = (fleet: Fleet) => {
  const far = farPc(fleet)
  if (far?.status.kind === 'behind') return `${far.name} is ${behindText(far.status, fleet.target.get()).toLowerCase()}`
  const changes = changesFor(fleet.target.get(), fleet.pending.get().map(pc => pc.status))
  const headline = changes.find(isNotable) ?? changes[0]
  if (!headline) return fleet.target.get()?.name ?? ''
  return changes.length > 1 ? `${changeLine(headline)}, +${changes.length - 1} more` : changeLine(headline)
}

const runName = (fleet: Fleet) => fleet.run.get()?.name ?? ''

const failedNames = (fleet: Fleet) =>
  fleet.runRows
    .get()
    .filter(row => row.status.kind === 'failed')
    .map(row => row.pc?.name)
    .join(', ')

const content = (fleet: Fleet, kind: BannerKind, open: () => void): Child[] => {
  const count = () => plural(fleet.run.get()?.keys.length ?? 0, 'PC')
  switch (kind) {
    case 'running':
      return [
        statusMark('text-accent-400', spinner()),
        text(() => `Updating ${count()} to ${runName(fleet)}`),
        quietButton({ size: 'sm', onClick: open }, 'See'),
      ]
    case 'done':
      return [
        okMark(),
        text(() => `${count()} updated to ${runName(fleet)}`),
        primaryAction({ size: 'sm', onClick: fleet.finish }, 'Done'),
      ]
    case 'failed':
      return [
        statusMark('text-danger-400', icon('alert', 14)),
        text(() => `Could not update ${failedNames(fleet)}`),
        primaryAction({ size: 'sm', onClick: open }, 'See'),
      ]
    case 'ready':
      return [
        statusMark('text-accent-400', icon('reload', 14)),
        text(
          () => readyTitle(fleet),
          () => readySubtitle(fleet),
          () => !!farPc(fleet),
        ),
        quietButton({ size: 'sm', disabled: fleet.busy, onClick: () => void fleet.later() }, 'Later'),
        primaryAction({ size: 'sm', onClick: open }, 'See'),
      ]
  }
}

export const bannerView = (fleet: Fleet, kind: () => BannerKind | undefined, open: () => void) =>
  div(
    { class: 'w-full px-3 pt-2' },
    div(
      {
        role: 'status',
        class: 'flex w-full items-center gap-3 rounded-lg border border-accent-800 bg-accent-950 px-3 py-2 text-sm animate-fade',
      },
      dynamicChild(derive(() => kind() ?? 'ready'), current => div({ class: 'flex min-w-0 flex-1 items-center gap-3' }, ...content(fleet, current, open))),
    ),
  )
