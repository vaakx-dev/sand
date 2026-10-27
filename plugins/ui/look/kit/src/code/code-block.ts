import { div, el, read, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { copyButton } from '../buttons/copy'

export type CodeBlockProps = Props<HTMLPreElement> & {
  copy?: () => string
  danger?: MaybeReactive<boolean>
}

export const codeBlock = ({ copy, danger = false, class: extra, ...props }: CodeBlockProps, ...children: Child[]) =>
  div(
    { class: 'flex min-w-0 items-start gap-2 rounded-xl bg-neutral-800 p-3' },
    el(
      'pre',
      {
        ...props,
        class: ['min-w-0 flex-1 overflow-auto font-mono text-xs whitespace-pre-wrap wrap-anywhere', () => (read(danger) ? 'text-danger-400' : 'text-neutral-100'), extra],
      },
      ...children,
    ),
    copy ? copyButton({ text: copy, surface: 'raised', class: '-my-1 -mr-1', disabled: () => !copy() }) : null,
  )
