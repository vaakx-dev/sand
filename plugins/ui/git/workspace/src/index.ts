import { composer } from '@sand/composer/contract'
import { gitControl } from '@sand/git-control/contract'
import { type ThreadPullsClient, threadPullsClient } from '@sand/git-pulls/contract'
import { keys } from '@sand/keys/contract'
import { palette } from '@sand/palette/contract'
import { settings } from '@sand/settings/contract'
import { joinDisposers } from '@sand/util'
import { threadSelect } from '@sand/web-client/contract'
import { owned } from '@sand/reactive'
import { effect, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { cleanupOpener } from './clean/open'
import { draftChoices } from './draft/choices'
import { worktreeCreator } from './draft/creator'
import { workspaceDefaults } from './draft/defaults'
import { workspaceEntry } from './draft/entry'
import { followDraft } from './draft/model'
import { inject } from './inject'
import { workspaceSource } from './palette/source'
import { proposalCard } from './proposal/card'
import { followProposal } from './proposal/follow'
import { defaultSection } from './settings/section'
import { setupCard } from './setup/card'
import { followSetup } from './setup/follow'
import { cleanUpAction } from './thread/clean-up'
import { worktreeMove } from './thread/move'
import { preloadWorktrees } from './thread/preload'
import { moveSection, removeSection } from './thread/section'
import { worktreeCache } from './worktrees/cache'

export default definePlugin({
  name: 'git-workspace',
  description: "Where a thread works: pick the main checkout or a worktree for a new thread, follow worktree setup, and move or remove a thread's worktree",
  inject,
  apply(ctx) {
    const { cache, choices, defaults, model, setup, proposal, entry, card, offer, open } = owned(ctx, () => {
      const cache = worktreeCache(ctx)
      const choices = draftChoices()
      const defaults = workspaceDefaults(ctx)
      const model = followDraft(ctx, cache, choices, defaults)
      const setup = followSetup(ctx)
      const proposal = followProposal(ctx)
      const open = sig(false)
      return {
        cache,
        choices,
        defaults,
        model,
        setup,
        proposal,
        open,
        entry: workspaceEntry(ctx, model, cache, defaults, open),
        card: setupCard(ctx, setup),
        offer: proposalCard(ctx, proposal),
      }
    })
    preloadWorktrees(ctx, cache)
    ctx.on(threadSelect, () => open.set(false))

    ctx.effect(() => ctx.threads.creator(worktreeCreator(ctx, model, choices)))
    ctx.watch(composer, found =>
      found
        ? joinDisposers(
            effect(() => (model.visible.get() ? found.plus(entry, 10) : undefined)),
            effect(() => (setup.visible.get() ? found.slot('tab', card, 10) : undefined)),
            effect(() => (proposal.visible.get() && !setup.visible.get() ? found.slot('tab', offer, 10) : undefined)),
          )
        : undefined,
    )
    ctx.watch(keys, found =>
      found?.bind({
        key: 'mod+shift+x',
        global: true,
        when: () => model.visible.get(),
        run: () => open.set(true),
      }),
    )
    const pulls = sig<ThreadPullsClient | undefined>(undefined)
    ctx.watch(threadPullsClient, found => {
      pulls.set(found)
    })
    const move = worktreeMove(ctx)
    ctx.watch(gitControl, found =>
      found
        ? joinDisposers(
            found.moves.register(move),
            found.menu.section(moveSection(ctx, move)),
            found.menu.section(removeSection(ctx, cache)),
            found.actions.register(cleanUpAction(ctx, cache, pulls)),
          )
        : undefined,
    )
    const openCleanup = cleanupOpener(ctx)
    ctx.watch(palette, found => found?.source(workspaceSource(ctx, choices, cache, openCleanup)))
    ctx.watch(settings, found => found?.section({ page: 'git', id: 'git-workspace.default', order: 10, render: defaultSection(ctx, defaults) }))
  },
})
