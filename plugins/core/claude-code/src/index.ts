import { llmPlans, type ProviderCapabilities } from '@sand/accounts/contract'
import { appPlan, blankFiles, type Provider } from '@sand/app-plan'
import { media, type Media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { modelCatalog } from './account/models'
import { readUsage } from './account/probe'
import { readStatus, signIn, signOut } from './account/sign-in'
import { claude } from './cli/binary'
import { sessionFiles } from './session/files'
import { claudeHistory } from './session/history'
import { openSession } from './session/session'

const CAPS: ProviderCapabilities = {
  native: true,
  resume: true,
  inject: false,
  reconfigure: ['effort'],
  processScope: 'thread',
  cacheTtlMs: 5 * 60_000,
}

const claudeCode = (media: Media): Provider => ({
  id: 'claude',
  label: 'Claude Code',
  name: 'Claude',
  detail: 'Uses your sign-in from the Claude Code app on this PC',
  logo: 'anthropic',
  family: 'anthropic',
  caps: CAPS,
  toolLoading: 'search',
  binary: claude,
  account({ folder }, report) {
    const models = modelCatalog(folder)
    const needs = { media, config: folder, report }
    return {
      status: () => readStatus(folder),
      signIn: signal => signIn(signal, folder),
      signOut: () => signOut(folder),
      models: models.list,
      usage: () => readUsage(folder),
      history: claudeHistory(folder),
      open: async (setup, output, resume) => openSession({ ...setup, model: await models.cliName(setup.model) }, output, needs, resume ? { id: resume, start: 'resume' } : undefined),
      blank: async (session, values) => blankFiles(await sessionFiles(session, folder), values),
    }
  },
})

export default definePlugin({
  name: 'claude-code',
  description: 'Adds Claude Code to Settings → Accounts using the Claude Code app on this PC: sand runs the claude CLI with sand’s own tools and prompt; the app keeps its own sign-in, and each Claude account added beside it keeps its sign-in in its own folder',
  inject: { media },
  apply(ctx) {
    ctx.watch(llmPlans, plans => plans?.register(appPlan(claudeCode(ctx.media), plans)))
  },
})
