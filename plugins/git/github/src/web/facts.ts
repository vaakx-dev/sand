import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { div, dynamicChild, span } from '@vaakx-dev/vrui'
import type { PullSummary } from '../contract'
import { pullStateLook } from './look'

export type PullFacts = Pick<PullSummary, 'state' | 'base' | 'head' | 'files' | 'add' | 'del'>

export const pullFactsLine = (kit: Kit, pull: () => PullFacts, { files = true }: { files?: boolean } = {}) =>
  div(
    { class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400' },
    dynamicChild(
      () => pull().state,
      state => {
        const look = pullStateLook(state)
        return kit.badge(look.tone, kit.icon(look.icon, 12), look.label)
      },
    ),
    span({ class: 'min-w-0 truncate', title: () => `${pull().head} into ${pull().base}` }, () => `${pull().base} ← ${pull().head}`),
    files ? span({ class: 'shrink-0' }, () => plural(pull().files, 'file')) : null,
    kit.lineStat(
      () => pull().add,
      () => pull().del,
    ),
  )
