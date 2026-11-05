import type { ChipKind } from '@sand/context/contract'
import type { PullRef } from '@sand/github/contract'
import { capital } from '@sand/util'
import { div } from '@vaakx-dev/vrui'
import { pullKind, pullOf } from '../pull'

export const pullChip = (open: (pull: PullRef, url: string) => void): ChipKind => ({
  kind: pullKind,
  title: 'Pull request',
  icon: 'pull-request',
  details(record) {
    const pull = pullOf(record)
    if (!pull) return null
    return div({ class: 'text-sm text-neutral-100 wrap-anywhere' }, pull.title, div({ class: 'text-neutral-400' }, `${pull.repo} · ${capital(pull.state)}`))
  },
  action: {
    label: 'Open pull request',
    run(record) {
      const pull = pullOf(record)
      if (pull) open(pull, pull.url)
    },
  },
})
