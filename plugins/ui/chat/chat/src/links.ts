import type { LinkScheme } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { threadScheme, type ThreadView } from './contract'

export const threadLinks = (kit: Kit, view: ThreadView): LinkScheme => ({
  scheme: threadScheme,
  order: 1,
  render: (thread, label) => kit.plainButton({ class: 'underline hover:text-neutral-400', onClick: () => view.open(thread) }, ...label),
})
