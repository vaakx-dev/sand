import type { Kit } from '@sand/ui-kit/contract'
import { bytes } from '@sand/util'
import { derive, div, dynamicChild, span } from '@vaakx-dev/vrui'
import { type Local, localModel } from '../../contract'
import type { VoiceModel } from '../model'

type Status = Local['status']

const progressOf = (local: Local | undefined) => (local?.status === 'downloading' ? local : { done: 0, total: 1 })

const deviceOf = (local: Local | undefined) => (local?.status === 'ready' && local.device ? `Runs on ${local.device}` : 'Runs on this PC')

const messageOf = (local: Local | undefined) => (local?.status === 'failed' || local?.status === 'unsupported' ? local.message : '')

const localStatus = (kit: Kit, model: VoiceModel, retry: () => void) => {
  const local = derive(() => model.state.get()?.local)
  const status = derive((): Status | undefined => local.get()?.status)

  const progress = derive(() => progressOf(local.get()))

  const downloading = () =>
    div(
      { class: 'flex flex-col gap-2 rounded-lg bg-neutral-800 px-3 py-3 text-sm' },
      div(
        { class: 'flex items-center gap-2' },
        span({ class: 'flex-1 text-neutral-100' }, 'Downloading the speech model'),
        span({ class: 'tabular-nums text-neutral-400' }, () => `${bytes(progress.get().done)} of ${bytes(progress.get().total)}`),
      ),
      div(
        { class: 'h-1.5 overflow-hidden rounded-full bg-neutral-700', role: 'progressbar', 'aria-label': 'Download progress' },
        span({ class: 'block h-full bg-accent-500 transition-all', style: { width: () => `${(progress.get().done / progress.get().total) * 100}%` } }),
      ),
      span({ class: 'text-xs text-neutral-500' }, 'Only this once. sand checks the download before it uses it.'),
    )

  const view = (shown: Status | undefined) => {
    switch (shown) {
      case 'downloading':
        return downloading()
      case 'installing':
        return kit.banner({ icon: 'spinner', title: 'Installing the speech engine…' })
      case 'checking':
        return kit.banner({ icon: 'spinner', title: 'Checking the speech model…' })
      case 'ready':
        return kit.banner({ tone: 'success', icon: 'circle-check', title: 'Ready', detail: () => deviceOf(local.get()) })
      case 'failed':
        return kit.banner({ tone: 'danger', title: () => messageOf(local.get()), actions: [kit.secondaryAction({ onClick: retry }, 'Try again')] })
      case 'unsupported':
        return kit.banner({ tone: 'warning', title: () => messageOf(local.get()) })
      default:
        return kit.banner({ icon: 'spinner', title: 'Starting…' })
    }
  }

  return kit.pageSection({ title: localModel.name }, dynamicChild(status, view))
}

export { localStatus }
