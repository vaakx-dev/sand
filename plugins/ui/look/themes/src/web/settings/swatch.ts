import type { Kit } from '@sand/ui-kit/contract'
import { div, input, span } from '@vaakx-dev/vrui'

export interface SwatchProps {
  label: string
  value: () => string
  preview(hex: string): void
  choose(hex: string): void
}

export const swatchMark = (hex: () => string, size = 'h-4 w-4') => span({ class: ['block shrink-0 rounded-sm ring-1 ring-inset ring-white/15', size], style: () => ({ background: hex() }) })

const picker = ({ label, value, preview, choose }: SwatchProps) =>
  input({
    type: 'color',
    'aria-label': label,
    value,
    class: 'absolute inset-0 h-full w-full cursor-pointer opacity-0',
    onInput: (event: Event) => preview((event.currentTarget as HTMLInputElement).value),
    onChange: (event: Event) => choose((event.currentTarget as HTMLInputElement).value),
  })

export const swatchButton = (kit: Kit, props: SwatchProps) =>
  div({ class: 'relative inline-flex' }, kit.pickerButton({ tabIndex: -1, lead: swatchMark(props.value) }, span({ class: 'font-mono text-xs' }, props.value)), picker(props))

export const swatchTile = (props: SwatchProps & { changed: () => boolean; name: string }) =>
  div(
    { class: 'relative flex flex-col items-center gap-1' },
    div({ class: 'relative' }, swatchMark(props.value, 'h-8 w-8 rounded-md'), span({ class: () => (props.changed() ? 'absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-neutral-800' : 'hidden') })),
    span({ class: 'font-mono text-xs tabular-nums text-neutral-500' }, props.name),
    picker(props),
  )
