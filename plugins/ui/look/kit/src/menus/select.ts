import { div, option, read, select, span, type MaybeReactive } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import type { Choice } from '../rows/settings'

export const selectMenu = <T extends string>(choices: Choice<T>[], active: MaybeReactive<T | undefined>, choose: (value: T) => void) => {
  const picker: HTMLSelectElement = select(
    {
      class: 'h-8 w-full appearance-none rounded-lg bg-neutral-800 pr-8 pl-3 text-sm text-neutral-100 cursor-pointer outline-none hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-accent-500',
      onChange: () => {
        const picked = choices.find(choice => choice.value === picker.value)
        if (picked) choose(picked.value)
      },
    },
    choices.map(choice => option({ value: choice.value, selected: () => read(active) === choice.value }, choice.label)),
  )
  return div(
    { class: 'relative flex min-w-40' },
    picker,
    span({ class: 'pointer-events-none absolute inset-0 flex items-center justify-end pr-2 text-neutral-500' }, icon('down', 14)),
  )
}
