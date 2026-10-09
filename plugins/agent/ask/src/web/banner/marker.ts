import { derive, dynamicChild, icon, span } from '@sand/dom'

export const marker = (round: boolean, label: string, on: () => boolean, danger = false) => {
  const checked = derive(on)
  return span(
    {
      class: [
        'inline-flex h-5 w-5 shrink-0 items-center justify-center font-mono text-xs ring-1 transition-colors',
        round ? 'rounded-full' : 'rounded-md',
        () => {
          if (!checked.get()) return 'text-neutral-500 ring-neutral-600'
          return danger ? 'bg-danger-500 text-white ring-danger-500' : 'bg-accent-500 text-white ring-accent-500'
        },
      ],
    },
    dynamicChild(checked, value => (value ? span({ class: 'inline-flex' }, icon('check', 12)) : span(label))),
  )
}
