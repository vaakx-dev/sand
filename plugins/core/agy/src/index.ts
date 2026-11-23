import { llmPlans, type AppPlace, type AppPlan, type ProviderCapabilities } from '@sand/accounts/contract'
import { media, type Media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { listModels, readStatus, signInAgy, signOutAgy } from './account'
import { INSTALL_URL } from './binary'
import { agyHistory } from './history'
import { readLimits } from './limits'
import { openSession } from './session'

const CAPS: ProviderCapabilities = {
  native: true,
  resume: true,
  inject: false,
  steer: false,
  reconfigure: ['effort'],
  processScope: 'thread',
  cacheTtlMs: 5 * 60_000,
}

function agyAccount(mediaService: Media, { id, folder }: { id: string; folder?: string }): AppPlan {
  const needs = { media: mediaService, folder }
  return {
    id,
    label: 'Antigravity',
    name: 'Gemini',
    detail: 'Uses your sign-in from the Antigravity CLI (agy) on this PC',
    logo: 'antigravity',
    app: 'Antigravity',
    install: INSTALL_URL,
    caps: CAPS,
    status: () => readStatus(folder),
    signIn: signal => signInAgy(signal, folder),
    signOut: () => signOutAgy(folder),
    models: () => listModels(folder),
    open: (setup, output, resume) => openSession(setup, output, needs, resume),
    history: agyHistory(folder),
    usage: () => readLimits(folder),
  }
}

function agyPlan(mediaService: Media): AppPlan {
  return {
    ...agyAccount(mediaService, { id: 'agy' }),
    another: (place: AppPlace) => agyAccount(mediaService, place),
  }
}

export default definePlugin({
  name: 'agy',
  description: 'Adds Antigravity (agy) to Settings → Accounts so sand can run Gemini models with sand’s own tools and prompt',
  inject: { media },
  apply(ctx) {
    ctx.watch(llmPlans, plans => plans?.register(agyPlan(ctx.media)))
  },
})
