import { div, media, span, type Child, type Props } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { icon } from '../icons/lucide'

export type CardItemProps = Props<HTMLButtonElement> & {
  lead: Child
  end?: Child
  menu?: boolean
  mono?: boolean
}

const itemLook = (pressable: boolean) => [
  'flex w-full min-w-0 items-center gap-3 rounded-lg px-2 text-left text-sm text-neutral-100',
  pressable ? 'hover:bg-neutral-700' : '',
]

const itemHeight = () => {
  const fine = media('(pointer: fine)')
  return () => (fine.get() ? 'py-1.5' : 'py-3')
}

export const cardItem = ({ lead, end, menu = false, mono = false, class: extra, ...props }: CardItemProps, ...label: Child[]) => {
  const height = itemHeight()
  const parts = [
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, lead),
    span({ class: ['min-w-0 flex-1 truncate', mono ? 'font-mono text-xs' : ''] }, ...label),
    end === undefined ? null : span({ class: 'max-w-40 min-w-0 truncate text-xs whitespace-nowrap text-neutral-500 tabular-nums' }, end),
    menu ? span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 'xs')) : null,
  ]
  if (!props.onClick) return div({ title: props.title, class: () => [itemLook(false), height(), extra] }, ...parts)
  return plainButton({ ...props, class: () => [itemLook(true), height(), extra] }, ...parts)
}

export const cardRule = () => div({ role: 'separator', class: 'mx-2 my-1 h-px bg-neutral-700' })

export const cardCaption = (...children: Child[]) => div({ class: 'flex min-w-0 items-center px-2 pt-1.5 pb-1 text-xs text-neutral-500' }, ...children)
