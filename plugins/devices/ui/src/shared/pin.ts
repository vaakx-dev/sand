import { div, span } from '@vaakx-dev/vrui'

export type PinSize = 'sm' | 'lg'

const boxes: Record<PinSize, string> = {
  sm: 'h-10 w-8 rounded-md text-lg',
  lg: 'h-16 w-12 rounded-lg text-3xl',
}

export const pinCode = (code: string, size: PinSize = 'lg') =>
  div(
    { class: ['flex gap-2', size === 'lg' ? 'justify-center' : 'justify-start'], role: 'img', 'aria-label': `Code ${code.split('').join(' ')}` },
    code
      .split('')
      .map(digit => span({ class: [boxes[size], 'flex items-center justify-center bg-neutral-900 font-mono font-semibold text-neutral-100 ring-1 ring-neutral-700'] }, digit)),
  )
