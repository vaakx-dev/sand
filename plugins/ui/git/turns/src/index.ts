import { transcript } from '@sand/chat/contract'
import { changesPanel } from '@sand/git-changes/contract'
import { definePlugin } from 'drydock'
import { turnFooter } from './footer/card'
import { inject } from './inject'
import { turnParts } from './parts'
import { turnScopes } from './scopes/source'

export default definePlugin({
  name: 'git-turns',
  description: "A card under each reply with the files that turn changed, a Review button that opens the Changes panel on it, restoring files to before or after the turn, and a Turns group in the Changes panel's scope menu",
  inject,
  apply(ctx) {
    const parts = turnParts(ctx)
    ctx.watch(transcript, found => found?.turnFooter({ id: 'git-turns', order: 10, view: turnFooter(parts) }))
    ctx.watch(changesPanel, found => {
      parts.panel.set(found)
      return found?.scopes.register(turnScopes(parts))
    })
  },
})
