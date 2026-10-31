import { composer } from '@sand/composer/contract'
import { gitControl } from '@sand/git-control/contract'
import { type ThreadPullsClient, threadPullsClient } from '@sand/git-pulls/contract'
import { keys } from '@sand/keys/contract'
import { palette } from '@sand/palette/contract'
import { joinDisposers } from '@sand/util'
import { threadSelect } from '@sand/web-client/contract'
import { owned } from '@sand/web-client/reactive'
import { effect, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { workspaceChip } from './draft/chip'
import { draftChoices } from './draft/choices'
import { worktreeCreator } from './draft/creator'
import { workspaceDefaults } from './draft/defaults'
import { followDraft } from './draft/model'
import { inject } from './inject'
import { workspaceSource } from './palette/source'
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
    const { cache, choices, model, setup, chip, card, open } = owned(ctx, () => {
      const cache = worktreeCache(ctx)
      const choices = draftChoices()
      const defaults = workspaceDefaults(ctx)
      const model = followDraft(ctx, cache, choices, defaults)
      const setup = followSetup(ctx)
      const open = sig(false)
      return { cache, choices, model, setup, open, chip: workspaceChip(ctx, model, cache, defaults, open), card: setupCard(ctx, setup) }
    })
    preloadWorktrees(ctx, cache)
    ctx.on(threadSelect, () => open.set(false))

    ctx.effect(() => ctx.threads.creator(worktreeCreator(ctx, model, choices)))
    ctx.watch(composer, found =>
      found
        ? joinDisposers(
            effect(() => (model.visible.get() ? found.slot('tray-start', chip, 10) : undefined)),
            effect(() => (setup.visible.get() ? found.slot('tab', card, 10) : undefined)),
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
    ctx.watch(palette, found => found?.source(workspaceSource(ctx, choices, cache)))
  },
})
