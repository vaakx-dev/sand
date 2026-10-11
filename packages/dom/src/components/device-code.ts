import { div, read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { copyButton } from './copy'
import { dot } from './marks'

export const deviceCode = (code: MaybeReactive<string>) =>
  div(
    { class: 'flex flex-wrap items-center gap-2' },
    span({ class: 'rounded-lg bg-neutral-900 px-4 py-2 font-mono text-2xl font-semibold text-neutral-100 ring-1 ring-neutral-700' }, () => read(code)),
    copyButton({ text: () => read(code), label: 'Copy', size: 'md' }),
  )

export const waitingLine = (text: Child) => div({ role: 'status', class: 'flex items-center gap-2 text-xs text-neutral-400' }, dot('warning'), span(text))
