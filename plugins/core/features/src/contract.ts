import type { Feature } from '@sand/config/contract'
import { request, type } from '@sand/host-hub/contract'
import { swapWaitMs } from '@sand/host-runtimes/contract'
import { service } from 'drydock'
import { z } from 'zod'

export type { Feature }

export interface FeatureChoice {
  features: Feature[]
}

export interface FeatureState {
  on(id: string): boolean | undefined
}

export const featureState = service<FeatureState>('featureState')

export const featuresList = request('features.list', { input: () => z.object({}), output: type<FeatureChoice>(), callers: 'any', waitMs: swapWaitMs })

export const featuresSet = request('features.set', { input: () => z.object({ changes: z.record(z.string(), z.boolean()) }), output: type<FeatureChoice>(), callers: 'any', waitMs: swapWaitMs })
