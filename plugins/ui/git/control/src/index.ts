import { changesPanel } from '@sand/git-changes/contract'
import { keys } from '@sand/keys/contract'
import { settings } from '@sand/settings/contract'
import { joinDisposers } from '@sand/util'
import { threadSelect } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { buildControl } from './build'
import { gitControl } from './contract'
import { inject } from './inject'
import { controlRow } from './view/control'
import { startButton } from './view/start'

export default definePlugin({
  name: 'git-control',
  description: "Git at the top of the Changes tab: the branch chip opens a branch picker and one button commits, pushes or pulls the thread's folder",
  inject,
  apply(ctx) {
    const { parts, commit, sections, registry, moves, switchBranch } = buildControl(ctx)
    ctx.provide(gitControl, { menu: { section: sections.section }, actions: { register: registry.register }, moves, switchBranch })
    ctx.on(threadSelect, () => commit.close())
    ctx.watch(changesPanel, found => found && joinDisposers(found.slot(() => controlRow(parts), 'top'), found.slot(() => startButton(parts), 'no-repo')))
    ctx.watch(settings, found => found?.page({ id: 'git', label: 'Git', icon: 'branch', order: 35 }))
    ctx.watch(keys, found =>
      found?.bind({
        key: 'mod+shift+return',
        global: true,
        when: () => Boolean(parts.model.place.get()),
        run: commit.open,
      }),
    )
  },
})
