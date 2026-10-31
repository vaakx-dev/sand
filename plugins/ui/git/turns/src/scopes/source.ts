import type { ChangesScope, ChangesScopeSource } from '@sand/git-changes/contract'
import type { ListedTurn } from '@sand/git-snapshots/contract'
import type { GitPlace } from '@sand/git/contract'
import { clock, derive } from '@vaakx-dev/vrui'
import type { TurnParts } from '../parts'
import { agoText, hasChanges, inFolder, rangeOf, turnName, turnScopeId } from '../snapshots/turn'

const shownTurns = 20

const choicesOf = (turns: ListedTurn[], cwd: string): ChangesScope[] =>
  turns
    .filter(hasChanges)
    .filter(snapshot => inFolder(snapshot, cwd))
    .slice(-shownTurns)
    .reverse()
    .map(snapshot => ({
      id: turnScopeId(snapshot),
      label: `${turnName(snapshot, turns)} · ${agoText(snapshot.at)}`,
      group: 'Turns',
      icon: 'clock',
      stat: { add: snapshot.add, del: snapshot.del },
      scope: rangeOf(snapshot),
      fixed: true,
    }))

export const turnScopes = (parts: TurnParts): ChangesScopeSource => ({
  id: 'git-turns',
  order: 10,
  scopes: (place: GitPlace) => {
    const now = clock(60_000)
    return derive(() => {
      now.get()
      const id = parts.current.get()
      const thread = id ? parts.ctx.threads.get(id) : undefined
      return thread && thread.device === place.device ? choicesOf(parts.store.of(thread.id).get(), place.cwd) : []
    })
  },
})
