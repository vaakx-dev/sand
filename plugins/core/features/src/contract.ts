import type { Feature } from '@sand/config/contract'
import { request, type } from '@sand/host-hub/contract'
import { swapWaitMs } from '@sand/host-runtimes/contract'
import { service } from 'drydock'
import { z } from 'zod'

export type { Feature }

export type AddonStatus = 'available' | 'installed' | 'built-in'

export interface Addon {
  id: string
  label: string
  summary: string
  status: AddonStatus
  readme: string
  pictures: string[]
  version?: string
  update?: string
  needsSand?: string
}

export interface FeatureChoice {
  features: Feature[]
  addons: Addon[]
  catalogError?: string
}

export interface FeatureState {
  on(id: string): boolean | undefined
}

export const featureState = service<FeatureState>('featureState')

const addonIds = () => z.object({ ids: z.array(z.string().min(1)).min(1) })

export const featuresList = request('features.list', { input: () => z.object({}), output: type<FeatureChoice>(), callers: 'any', waitMs: swapWaitMs })

export const featuresSet = request('features.set', { input: () => z.object({ changes: z.record(z.string(), z.boolean()) }), output: type<FeatureChoice>(), callers: 'any', waitMs: swapWaitMs })

export const addonsReady = request('addons.ready', { input: () => z.object({}), output: type<Addon[]>(), callers: 'runtime' })

export const addonsPicture = request('addons.picture', {
  input: () => z.object({ id: z.string().min(1), file: z.string().min(1) }),
  output: type<string>(),
  callers: 'any',
})

export const addonsInstall = request('addons.install', { input: addonIds, output: type<FeatureChoice>(), callers: 'any', waitMs: swapWaitMs })

export const addonsUpdate = request('addons.update', { input: addonIds, output: type<FeatureChoice>(), callers: 'any', waitMs: swapWaitMs })

export const addonsRemove = request('addons.remove', { input: addonIds, output: type<FeatureChoice>(), callers: 'any', waitMs: swapWaitMs })
