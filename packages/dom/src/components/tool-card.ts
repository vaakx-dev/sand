import { derive, div, show, sig, span, type Child, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'
import { read } from '../reactive/read'
import { quietButton, rowButton } from './button'
import { copyButton } from './copy'

export interface ToolCardProps {
  icon: Child
  verb: Child
  target: Child
  targetClass?: ClassValue
  targetTitle?: MaybeReactive<string>
  meta?: Child
  actions?: Child
  failed?: MaybeReactive<boolean>
  onToggle?: () => void
}

export interface FoldProps {
  lines: MaybeReactive<number>
  chars?: MaybeReactive<number>
  limit?: number
  copy?: () => string
  copyLabel?: string
}

const fade = 'linear-gradient(#000 55%, transparent)'

export const toolCard = ({ icon, verb, target, targetClass, targetTitle = '', meta, actions, failed, onToggle }: ToolCardProps, ...body: Child[]) =>
  div(
    { class: 'group' },
    div(
      { class: 'flex min-h-8 items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-neutral-800' },
      rowButton(
        { class: 'min-h-8 flex-1 gap-2 rounded-lg px-2', onClick: () => onToggle?.() },
        span({ class: () => (read(failed ?? false) ? 'inline-flex shrink-0 text-danger-400' : 'inline-flex shrink-0 text-neutral-500') }, icon),
        span({ class: 'shrink-0 text-xs text-neutral-400' }, verb),
        span({ class: ['min-w-0 flex-1 truncate text-xs', targetClass ?? 'font-mono text-neutral-200'], title: targetTitle }, target),
        meta,
      ),
      actions && div({ class: 'flex shrink-0 items-center opacity-0 group-hover:opacity-100' }, actions),
    ),
    ...body,
  )

export const toolBody = (...content: Child[]) => div({ class: 'mb-2 min-w-0 pr-3 pl-3 text-xs md:pl-8' }, ...content)

const lineWidth = 120

export const fold = ({ lines, chars = 0, limit = 12, copy, copyLabel = 'Copy output' }: FoldProps, ...content: Child[]) => {
  const long = derive(() => read(lines) > limit || read(chars) > limit * lineWidth)
  const open = sig(false)
  const clipped = () => long.get() && !open.get()
  const more = () =>
    quietButton({ size: 'sm', onClick: () => open.set(!open.get()) }, () =>
      open.get() ? 'Show less' : read(lines) > limit ? `Show all ${read(lines)} lines` : 'Show all',
    )
  return div(
    div(
      {
        class: () => (clipped() ? 'max-h-48 overflow-hidden' : ''),
        style: { maskImage: () => (clipped() ? fade : null), WebkitMaskImage: () => (clipped() ? fade : null) },
      },
      ...content,
    ),
    show(
      derive(() => long.get() || Boolean(copy)),
      () => div({ class: 'mt-1 flex items-center gap-1' }, show(long, more), copy && copyButton({ text: copy, label: copyLabel })),
    ),
  )
}
