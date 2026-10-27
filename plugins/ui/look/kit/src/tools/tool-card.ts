import { derive, div, read, show, sig, span, type Child, type ClassValue, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { quietButton, rowButton } from '../buttons/button'

export interface ToolCardProps {
  icon: Child
  verb: Child
  target: Child
  targetClass?: ClassValue
  targetTitle?: MaybeReactive<string>
  meta?: Child
  actions?: Child
  failed?: MaybeReactive<boolean>
  expanded?: MaybeReactive<boolean>
  onToggle?: () => void
  headProps?: Props<HTMLDivElement>
}

export interface FoldProps {
  lines: MaybeReactive<number>
  chars?: MaybeReactive<number>
}

export const toolCard = ({ icon, verb, target, targetClass, targetTitle = '', meta, actions, failed = false, expanded, onToggle, headProps }: ToolCardProps, ...body: Child[]) =>
  div(
    { class: 'group' },
    div(
      { ...headProps, class: 'flex min-h-8 items-center gap-1 rounded-md pr-1 transition-colors hover:bg-neutral-800' },
      rowButton(
        {
          ...(expanded !== undefined && { 'aria-expanded': () => String(read(expanded)) }),
          class: 'min-h-8 flex-1 gap-2 rounded-md px-2 text-sm',
          onClick: () => onToggle?.(),
        },
        span({ class: ['inline-flex shrink-0', () => (read(failed) ? 'text-danger-400' : 'text-neutral-400')] }, icon),
        span({ class: 'shrink-0 text-neutral-400' }, verb),
        span({ class: ['min-w-0 flex-1 truncate', targetClass ?? 'font-mono text-neutral-100'], title: targetTitle }, target),
        meta,
      ),
      actions &&
        div(
          {
            class: [
              'flex shrink-0 items-center opacity-0 group-hover:opacity-100 group-focus-visible-within:opacity-100',
              () => (expanded === undefined || read(expanded) ? 'touch:opacity-100' : 'touch:hidden'),
            ],
          },
          actions,
        ),
    ),
    ...body,
  )

export const toolBody = (...content: Child[]) => div({ class: 'mb-2 min-w-0 pr-3 pl-3 text-xs md:pl-8' }, ...content)

const limit = 12
const lineWidth = 120
const fade = 'linear-gradient(#000 55%, transparent)'

export const fold = ({ lines, chars = 0 }: FoldProps, ...content: Child[]) => {
  const long = derive(() => read(lines) > limit || read(chars) > limit * lineWidth)
  const open = sig(false)
  const clipped = () => long.get() && !open.get()
  const moreLabel = () => {
    if (open.get()) return 'Show less'
    return read(lines) > limit ? `Show all ${read(lines)} lines` : 'Show all'
  }
  return div(
    div(
      {
        class: () => (clipped() ? 'max-h-48 overflow-hidden' : ''),
        style: { maskImage: () => (clipped() ? fade : null), WebkitMaskImage: () => (clipped() ? fade : null) },
      },
      ...content,
    ),
    show(long, () => div({ class: 'mt-1 flex items-center gap-1' }, quietButton({ size: 'sm', onClick: open.toggle() }, moreLabel))),
  )
}
