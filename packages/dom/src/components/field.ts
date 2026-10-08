import { div, input, type Props } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'

export const textInput = ({ class: extra, ...props }: Props<HTMLInputElement>) =>
  input({
    autocomplete: 'off',
    spellcheck: false,
    ...props,
    class: ['h-8 w-full min-w-0 rounded-lg bg-neutral-800 px-3 text-sm text-neutral-100 outline-none focus:ring-1 focus:ring-accent-500', extra],
  })

export const searchRow = (field: HTMLInputElement) =>
  div({ class: 'flex h-12 shrink-0 items-center gap-3 px-5 text-neutral-400' }, icon('search', 17), field)

export const searchInput = ({ class: extra, ...props }: Props<HTMLInputElement>) =>
  input({ autocomplete: 'off', spellcheck: false, ...props, class: ['min-w-0 flex-1 text-base text-neutral-100', extra] })
