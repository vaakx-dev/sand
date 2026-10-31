import { gitControl } from '@sand/git-control/contract'
import { palette } from '@sand/palette/contract'
import { settings } from '@sand/settings/contract'
import { sidebar } from '@sand/sidebar/contract'
import { joinDisposers } from '@sand/util'
import { owned } from '@sand/web-client/reactive'
import { definePlugin } from 'drydock'
import { buildPulls } from './build'
import { threadPullsClient } from './contract'
import { createAction, shipAction } from './control/actions'
import { inject } from './inject'
import { pullSource } from './palette/source'
import { registerPanel } from './panel/register'
import { githubSignIns } from './settings/github'
import { gitSettingsPage } from './settings/page'
import { pairedPcs } from './settings/pcs'
import { pullDecoration } from './sidebar/decoration'

export default definePlugin({
  name: 'git-pulls',
  description: "Pull requests on threads: the PR panel tab with the next step, the Create PR sheet, sidebar pills, palette commands and GitHub sign-in",
  inject,
  apply(ctx) {
    const { parts, client } = buildPulls(ctx)
    const signIns = githubSignIns(ctx)
    const pcs = owned(ctx, () => pairedPcs(ctx))
    ctx.provide(threadPullsClient, client)
    registerPanel(parts)
    ctx.watch(gitControl, found => found && joinDisposers(found.actions.register(shipAction(client)), found.actions.register(createAction(client))))
    ctx.watch(sidebar, found => found?.decorate(pullDecoration(ctx, client)))
    ctx.watch(palette, found => found?.source(pullSource(parts)))
    ctx.watch(settings, found => found?.page({ id: 'git', label: 'Git', icon: 'branch', order: 35, render: () => gitSettingsPage(ctx.kit, pcs, signIns) }))
  },
})
