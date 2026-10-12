import { input, label, type Child, type Props } from '@vaakx-dev/vrui'
import { paneHead } from '../heads/page-head'
import { icon } from '../icons/lucide'

const inputSizes = { sm: 'h-8 text-sm', md: 'h-12 text-base' }

export const textInput = ({ class: extra, ...props }: Props<HTMLInputElement>, size: keyof typeof inputSizes = 'sm') =>
  input({
    autocomplete: 'off',
    spellcheck: false,
    ...props,
    class: ['w-full min-w-0 rounded-lg bg-neutral-900 px-3 text-neutral-100 outline-none ring-1 ring-neutral-600 placeholder:text-neutral-500 focus:ring-accent-500', inputSizes[size], extra],
  })

export const searchField = ({ class: extra, ...props }: Props<HTMLInputElement>) =>
  label(
    { class: 'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-neutral-500 ring-1 ring-neutral-600 focus-within:ring-accent-500' },
    icon('search', 16),
    input({
      enterKeyHint: 'search',
      autocomplete: 'off',
      spellcheck: false,
      ...props,
      class: ['min-w-0 flex-1 text-base text-neutral-100 outline-none placeholder:text-neutral-500 md:text-sm', extra],
    }),
  )

export const searchRow = (props: Props<HTMLInputElement>, lead?: Child) => paneHead({ led: Boolean(lead) }, lead ?? null, searchField(props))
