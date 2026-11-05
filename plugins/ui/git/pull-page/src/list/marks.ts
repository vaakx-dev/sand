import { pullStateLook } from '@sand/github/contract'
import type { InboxPull } from '@sand/pull-inbox/contract'
import { ago } from '@sand/util'
import { type Derive, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import type { PageParts } from '../parts'

export const repoName = (repo: string) => repo.split('/').at(-1) ?? repo

export const repeatsState = ({ state, reason }: InboxPull) => state !== 'draft' && reason.text === pullStateLook(state).label

export const stateMark = (parts: PageParts, pull: Sig<InboxPull>) =>
  dynamicChild(
    pull.map(value => value.state),
    state => {
      const look = pullStateLook(state)
      return span({ class: ['inline-flex', parts.kit.toneText[look.tone]], title: look.label }, parts.kit.icon(look.icon, 16))
    },
  )

export const updatedAgo = (pull: Sig<InboxPull>, minute: Derive<number>) =>
  span({ class: 'shrink-0 tabular-nums', title: () => new Date(pull.get().updated).toLocaleString() }, () => {
    minute.get()
    return ago(pull.get().updated)
  })
