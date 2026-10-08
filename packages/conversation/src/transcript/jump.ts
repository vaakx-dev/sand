import { button, div, icon, layer, type Sig } from '@sand/dom'

export const jumpButton = (shown: Sig<boolean>, jump: () => void) =>
  div(
    {
      class: [layer.sticky, 'pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-3'],
      style: { bottom: 'var(--dock-h, 0px)' },
      hidden: shown.map(value => !value),
    },
    button(
      {
        type: 'button',
        title: 'Jump to latest',
        class: 'pointer-events-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-neutral-800 text-neutral-300 shadow-lg ring-1 ring-neutral-700 hover:bg-neutral-700 hover:text-neutral-100',
        onClick: jump,
      },
      icon('down', 15),
    ),
  )
