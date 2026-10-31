import { input, label, textarea, type Child, type Props, type Sig } from '@vaakx-dev/vrui'
import { paneHead } from '../heads/page-head'
import { icon } from '../icons/lucide'

const inputSizes = { sm: 'h-8 text-sm', md: 'h-12 text-base' }

const fieldLook = 'w-full min-w-0 rounded-md bg-neutral-900 px-3 text-neutral-100 outline-none ring-1 ring-neutral-700 placeholder:text-neutral-500 focus-visible:ring-accent-500'

export type TextAreaProps = Props<HTMLTextAreaElement> & { bindValue: Sig<string>; rows?: number }

export const textInput = ({ class: extra, ...props }: Props<HTMLInputElement>, size: keyof typeof inputSizes = 'sm') =>
  input({
    autocomplete: 'off',
    spellcheck: false,
    ...props,
    class: [fieldLook, inputSizes[size], extra],
  })

export const textArea = ({ rows = 4, class: extra, ...props }: TextAreaProps) =>
  textarea({
    autocomplete: 'off',
    rows,
    ...props,
    class: [fieldLook, 'block resize-none py-2 text-base leading-relaxed md:text-sm', extra],
  })

export const searchField = ({ class: extra, ...props }: Props<HTMLInputElement>) =>
  label(
    { class: 'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md bg-neutral-900 px-3 text-neutral-500 ring-1 ring-neutral-700 focus-visible-within:ring-accent-500' },
    icon('search', 'md'),
    input({
      enterKeyHint: 'search',
      autocomplete: 'off',
      spellcheck: false,
      ...props,
      class: ['min-w-0 flex-1 text-base text-neutral-100 outline-none placeholder:text-neutral-500 md:text-sm', extra],
    }),
  )

export const searchRow = (props: Props<HTMLInputElement>, lead?: Child) => paneHead({ led: Boolean(lead) }, lead ?? null, searchField(props))
