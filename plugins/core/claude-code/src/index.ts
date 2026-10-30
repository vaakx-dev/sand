import { llmPlans, type AppPlan } from '@sand/accounts/contract'
import { media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { modelCatalog } from './account/models'
import { readUsage } from './account/probe'
import { signInClaude } from './account/sign-in'
import { readStatus, signOutClaude } from './account/status'
import { installUrl } from './cli/binary'
import { openSession, type SessionNeeds } from './session/session'

const claudePlan = (needs: SessionNeeds): AppPlan => {
  const models = modelCatalog()
  return {
    id: 'claude',
    label: 'Claude Code',
    name: 'Claude',
    detail: 'Uses your sign-in from the Claude Code app on this PC',
    logo: 'anthropic',
    app: 'Claude Code',
    install: installUrl,
    family: 'anthropic',
    status: readStatus,
    signIn: signInClaude,
    signOut: signOutClaude,
    models: models.list,
    usage: readUsage,
    open: async (setup, output) => openSession({ ...setup, model: await models.cliName(setup.model) }, output, needs),
  }
}

export default definePlugin({
  name: 'claude-code',
  description: 'Adds Claude Code to Settings → Accounts using the Claude Code app on this PC: sand runs the claude CLI with sand’s own tools and prompt, and the app keeps its own sign-in',
  inject: { media },
  apply(ctx) {
    ctx.watch(llmPlans, plans => plans?.register(claudePlan({ media: ctx.media, report: limits => plans.limits('claude', limits) })))
  },
})
