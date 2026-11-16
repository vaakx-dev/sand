import { llmPlans, type AppPlace, type AppPlan, type PlanLimits, type ProviderCapabilities } from '@sand/accounts/contract'
import { media, type Media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { modelCatalog } from './account/models'
import { readUsage } from './account/probe'
import { signInClaude } from './account/sign-in'
import { readStatus, signOutClaude } from './account/status'
import { installUrl } from './cli/binary'
import { sessionFiles } from './session/files'
import { openSession } from './session/session'

interface Needs {
  media: Media
  report(account: string, limits: PlanLimits): void
}

const caps: ProviderCapabilities = {
  native: true,
  resume: true,
  inject: false,
  steer: true,
  reconfigure: [],
  processScope: 'thread',
  cacheTtlMs: 5 * 60_000,
}

const claudeAccount = ({ media, report }: Needs, { id, folder }: { id: string; folder?: string }): AppPlan => {
  const models = modelCatalog(folder)
  const needs = { media, config: folder, report: (limits: PlanLimits) => report(id, limits) }
  return {
    id,
    label: 'Claude Code',
    name: 'Claude',
    detail: 'Uses your sign-in from the Claude Code app on this PC',
    logo: 'anthropic',
    app: 'Claude Code',
    install: installUrl,
    family: 'anthropic',
    caps,
    status: () => readStatus(folder),
    signIn: signal => signInClaude(signal, folder),
    signOut: () => signOutClaude(folder),
    models: models.list,
    usage: () => readUsage(folder),
    open: async (setup, output, resume) => openSession({ ...setup, model: await models.cliName(setup.model) }, output, needs, resume ? { id: resume, start: 'resume' } : undefined),
    sessionFiles: session => sessionFiles(session, folder),
  }
}

const claudePlan = (needs: Needs): AppPlan => ({
  ...claudeAccount(needs, { id: 'claude' }),
  another: (place: AppPlace) => claudeAccount(needs, place),
})

export default definePlugin({
  name: 'claude-code',
  description: 'Adds Claude Code to Settings → Accounts using the Claude Code app on this PC: sand runs the claude CLI with sand’s own tools and prompt; the app keeps its own sign-in, and each Claude account added beside it keeps its sign-in in its own folder',
  inject: { media },
  apply(ctx) {
    ctx.watch(llmPlans, plans => plans?.register(claudePlan({ media: ctx.media, report: (account, limits) => plans.limits(account, limits) })))
  },
})
