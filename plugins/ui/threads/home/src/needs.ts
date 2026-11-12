import { changesPatch } from '@sand/changes/contract'
import type { Need } from '@sand/needs-you/contract'
import { errorMessage } from '@sand/util'
import type { Wire } from '@sand/devices-contract'
import type { Thread } from '@sand/web-client/contract'
import { div, dynamicChild, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { mergeTrouble, type Changes } from './changes'
import { visibleThreads } from './items/items'
import { openThread } from './open'
import type { Shell } from '@sand/ui-shell/contract'

export interface NeedsParts {
  ctx: Context
  kit: import('@sand/ui-kit/contract').Kit
  threads: { list(): Thread[]; get(id: string): Thread | undefined }
  shell: Shell
  wire: Wire
  changes: Changes
  pulse: { version: { get(): number } }
}

const titleOf = (thread: Thread) => thread.info.title || 'Untitled thread'

const changesView = (parts: NeedsParts, thread: Thread) => {
  const change = parts.changes.get(thread.id)
  if (!change?.files.length) return null
  const first = change.files[0]!
  const patch = sig<{ lines: string[] } | undefined>(undefined)
  const error = sig('')
  void parts.wire.call(changesPatch, { session: thread.id, path: first.path }, thread.device).then(
    found => patch.set({ lines: found.hunks.flatMap(hunk => [hunk.header, ...hunk.lines]) }),
    err => error.set(errorMessage(err)),
  )
  return div(
    { class: 'flex flex-col gap-1' },
    dynamicChild(error, text => (text ? parts.kit.errorText(text) : null)),
    dynamicChild(patch, loaded =>
      loaded ? div({ class: 'max-h-64 overflow-auto rounded-md bg-neutral-900 px-2 py-1 font-mono text-xs whitespace-pre text-neutral-200' }, ...loaded.lines.map(line => div({}, line))) : div({ class: 'text-xs text-neutral-500' }, 'Loading…'),
    ),
    change.files.length > 1 ? div({ class: 'text-xs text-neutral-500' }, `+ ${change.files.length - 1} more`) : null,
  )
}

export const conflictNeeds = (parts: NeedsParts) => ({
  id: 'conflicts',
  items: (): Need[] => {
    parts.pulse.version.get()
    return visibleThreads(parts.threads.list()).flatMap(thread => {
      const trouble = mergeTrouble(parts.changes.get(thread.id))
      if (!trouble) return []
      const open = () => openThread(parts.ctx, parts.shell, thread.id)
      return [
        {
          id: `conflict:${thread.id}`,
          kind: 'conflict' as const,
          who: titleOf(thread),
          title: trouble,
          at: thread.info.updated,
          thread: thread.id,
          open,
          render: () =>
            div(
              { class: 'flex flex-col gap-2' },
              div({ class: 'text-sm wrap-anywhere text-neutral-200' }, trouble),
              div({ class: 'flex justify-end' }, parts.kit.quietButton({ size: 'sm', onClick: open }, 'Open thread')),
            ),
        },
      ]
    })
  },
})

export const reviewNeeds = (parts: NeedsParts) => ({
  id: 'review',
  items: (): Need[] => {
    parts.pulse.version.get()
    return visibleThreads(parts.threads.list()).flatMap(thread => {
      const change = parts.changes.get(thread.id)
      if (thread.running || change?.state !== 'ready') return []
      const open = () => openThread(parts.ctx, parts.shell, thread.id)
      return [
        {
          id: `review:${thread.id}`,
          kind: 'review' as const,
          who: titleOf(thread),
          title: 'Ready to review',
          at: thread.info.updated,
          thread: thread.id,
          open,
          render: () => {
            const { kit } = parts
            const busy = sig(false)
            const failure = sig('')
            const shown = sig(false)
            const merge = () => {
              busy.set(true)
              failure.set('')
              void parts.changes.merge(thread).catch(error => {
                failure.set(errorMessage(error))
                busy.set(false)
              })
            }
            return div(
              { class: 'flex flex-col gap-2' },
              div({ class: 'text-sm text-neutral-400' }, () => {
                const current = parts.changes.get(thread.id)
                return current ? `+${current.add} −${current.del}` : ''
              }),
              dynamicChild(failure, text => (text ? kit.errorText(text) : null)),
              dynamicChild(shown, on => (on ? changesView(parts, thread) : null)),
              div(
                { class: 'flex flex-wrap justify-end gap-2' },
                kit.quietButton({ size: 'sm', onClick: () => shown.set(!shown.get()) }, () => (shown.get() ? 'Hide changes' : 'View changes')),
                kit.quietButton({ size: 'sm', onClick: open }, 'Open thread'),
                kit.primaryAction({ size: 'sm', disabled: busy, onClick: merge }, 'Merge'),
              ),
            )
          },
        },
      ]
    })
  },
})

export const secretNeeds = (parts: NeedsParts) => ({
  id: 'secrets',
  items: (): Need[] => {
    parts.pulse.version.get()
    return visibleThreads(parts.threads.list()).flatMap(thread => {
      const waiting = thread.waiting
      if (waiting?.kind !== 'secret') return []
      const open = () => openThread(parts.ctx, parts.shell, thread.id)
      return [
        {
          id: `secret:${thread.id}:${waiting.call}`,
          kind: 'secret' as const,
          who: titleOf(thread),
          title: waiting.title,
          at: thread.started ?? thread.info.updated,
          thread: thread.id,
          open,
          render: () =>
            div(
              { class: 'flex flex-col gap-2' },
              div({ class: 'text-sm wrap-anywhere text-neutral-200' }, waiting.title),
              div({ class: 'flex justify-end' }, parts.kit.primaryAction({ size: 'sm', onClick: open }, 'Open thread')),
            ),
        },
      ]
    })
  },
})
