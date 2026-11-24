import { llmPlans, type ProviderCapabilities } from '@sand/accounts/contract'
import { appPlan, type Provider } from '@sand/app-plan'
import { media, type Media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { listModels, readStatus, signIn, signOut } from './account'
import { agy } from './binary'
import { agyHistory } from './history'
import { readLimits } from './limits'
import { openSession } from './session'

const CAPS: ProviderCapabilities = {
  native: true,
  resume: true,
  inject: false,
  reconfigure: ['effort'],
  processScope: 'thread',
  cacheTtlMs: 60 * 60_000,
}

function antigravity(media: Media): Provider {
  return {
    id: 'agy',
    label: 'Antigravity',
    name: 'Gemini',
    detail: 'Uses your sign-in from the Antigravity CLI (agy) on this PC',
    logo: 'antigravity',
    caps: CAPS,
    binary: agy,
    account({ folder }, report) {
      return {
        status: () => readStatus(folder),
        signIn: signal => signIn(signal, folder),
        signOut: () => signOut(folder),
        models: () => listModels(folder),
        usage: () => readLimits(folder),
        history: agyHistory(folder),
        open: (setup, output, resume) => openSession(setup, output, { media, folder, report }, resume),
      }
    },
  }
}

export default definePlugin({
  name: 'agy',
  description: 'Adds Antigravity (agy) to Settings → Accounts so sand can run Gemini models with sand’s own tools and prompt',
  inject: { media },
  apply(ctx) {
    ctx.watch(llmPlans, plans => plans?.register(appPlan(antigravity(ctx.media), plans)))
  },
})
