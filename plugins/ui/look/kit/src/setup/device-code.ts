import { div, read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { copyButton } from '../buttons/copy'
import { spinner } from '../marks/marks'

export const deviceCode = (code: MaybeReactive<string>) =>
  div(
    { class: 'flex flex-wrap items-center gap-2' },
    span({ class: 'rounded-xl bg-neutral-800 px-4 py-2 font-mono text-xl font-medium text-neutral-100' }, () => read(code)),
    copyButton({ text: () => read(code), label: 'Copy', size: 'md' }),
  )

export const waitingLine = (text: Child) => div({ role: 'status', class: 'flex items-center gap-2 text-xs text-neutral-400' }, spinner('sm'), span(text))
