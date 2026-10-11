import { el, span } from '@sand/dom'
import katex from 'katex'
import 'katex/contrib/mhchem'

const block = 'my-3 block first:mt-0 last:mb-0'

const failed = (tex: string, error: unknown, display: boolean) =>
  el(
    'code',
    {
      class: ['bg-neutral-800 font-mono text-xs text-danger-300', display ? [block, 'rounded-xl px-3 py-2 whitespace-pre-wrap'] : 'rounded-md px-1 py-px'],
      title: error instanceof Error ? error.message : String(error),
    },
    tex,
  )

export const typeset = (tex: string, displayMode: boolean) => {
  const node = span({ class: displayMode && [block, 'overflow-x-auto overflow-y-hidden p-1'] })
  try {
    katex.render(tex, node, { displayMode, throwOnError: true, strict: 'ignore', trust: false })
  } catch (error) {
    return failed(tex, error, displayMode)
  }
  return node
}
