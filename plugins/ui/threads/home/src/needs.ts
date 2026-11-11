import { changesPatch } from '@sand/changes/contract'
import type { Need } from '@sand/needs-you/contract'
import { turnSend } from '@sand/turns-contract/contract'
import { errorMessage, isRecord } from '@sand/util'
import { turns, type Thread } from '@sand/web-client/contract'
import { div, dynamicChild, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { Changes } from './changes'
import { visibleThreads } from './items/items'
import { openThread } from './owners'
import type { Shell } from '@sand/ui-shell/contract'

export interface NeedsParts {
  ctx: Context
  kit: import('@sand/ui-kit/contract').Kit
  threads: { list(): Thread[]; get(id: string): Thread | undefined }
  shell: Shell
  wire: { call(req: typeof turnSend, input: unknown, pc?: string): Promise<unknown> }
  changes: Changes
  pulse: { version: { get(): number } }
}

const titleOf = (thread: Thread) => thread.info.title || 'Untitled thread'

const choicesOf = (thread: Thread, call: string): string[] => {
  for (const entry of [...thread.entries.values()].reverse()) {
    if (entry.type !== 'message' || !isRecord(entry.data) || entry.data.role !== 'assistant' || !Array.isArray(entry.data.content)) continue
    const block = entry.data.content.find(item => isRecord(item) && item.type === 'tool_call' && item.id === call)
    if (!block || !isRecord(block.input)) continue
    const input = block.input
    if (Array.isArray(input.options)) return input.options.map((option: unknown) => (isRecord(option) ? String(option.label ?? option.text ?? '') : String(option))).filter(Boolean)
    if (Array.isArray(input.choices)) return input.choices.map(String).filter(Boolean)
    return []
  }
  return []
}

const sendAnswer = (parts: NeedsParts, thread: Thread, text: string) => {
  const service = parts.ctx.get(turns)
  if (service) return service.send(thread.id, text)
  return parts.wire.call(turnSend, { session: thread.id, prompt: text, clientRequestId: Bun.randomUUIDv7() }).then(() => undefined)
}

const changesView = (parts: NeedsParts, thread: Thread) => {
  const change = parts.changes.get(thread.id)
  if (!change?.files.length) return null
  const first = change.files[0]!
  const patch = sig<{ lines: string[] } | undefined>(undefined)
  const error = sig('')
  void (parts.wire.call(changesPatch as never as typeof turnSend, { session: thread.id, path: first.path }, thread.device) as Promise<{ lines: string[] }>).then(
    found => patch.set(found),
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

export const questionNeeds = (parts: NeedsParts) => ({
  id: 'questions',
  items: (): Need[] => {
    parts.pulse.version.get()
    return visibleThreads(parts.threads.list()).flatMap(thread => {
      const waiting = thread.waiting
      if (!waiting || waiting.kind !== 'question') return []
      const open = () => openThread(parts.ctx, parts.shell, thread.id)
      return [
        {
          id: `question:${thread.id}:${waiting.call}`,
          kind: 'question' as const,
          who: titleOf(thread),
          title: waiting.title,
          at: thread.started ?? thread.info.updated,
          thread: thread.id,
          open,
          render: () => {
            const { kit } = parts
            const choices = choicesOf(thread, waiting.call)
            const typed = sig('')
            const busy = sig(false)
            const failure = sig('')
            const send = (text: string) => {
              if (!text.trim() || busy.get()) return
              busy.set(true)
              failure.set('')
              void sendAnswer(parts, thread, text).catch(error => {
                failure.set(errorMessage(error))
                busy.set(false)
              })
            }
            return div(
              { class: 'flex flex-col gap-2' },
              div({ class: 'text-sm whitespace-pre-wrap wrap-anywhere text-neutral-200' }, waiting.title),
              choices.length ? div({ class: 'flex flex-wrap gap-2' }, ...choices.map(choice => kit.secondaryAction({ size: 'sm', disabled: busy, onClick: () => send(choice) }, choice))) : null,
              div(
                { class: 'flex min-w-0 items-center gap-2' },
                kit.textInput({ placeholder: '…or type your own answer', 'aria-label': 'Your answer', bindValue: typed, disabled: busy }),
                kit.primaryAction({ size: 'sm', disabled: busy, onClick: () => send(typed.get()) }, 'Send'),
              ),
              dynamicChild(failure, text => (text ? kit.errorText(text) : null)),
              div({ class: 'flex justify-end' }, kit.quietButton({ size: 'sm', onClick: open }, 'Open thread')),
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
