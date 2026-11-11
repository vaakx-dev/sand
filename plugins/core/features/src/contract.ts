import type { Feature } from '@sand/config/contract'
import { request, type } from '@sand/host-hub/contract'
import { service, type Dispose } from 'drydock'
import { z } from 'zod'

export type { Feature }

export interface FeatureChoice {
  features: Feature[]
  asked: boolean
}

export interface FirstStep {
  feature: string
  render(next: () => void): HTMLElement
}

export type FirstRunStage = 'question' | 'setup' | 'done'

export interface FirstRun {
  stage(): FirstRunStage | undefined
  step(step: FirstStep): Dispose
  steps(): FirstStep[]
  start(): void
}

export const firstRun = service<FirstRun>('firstRun')

export interface FeatureState {
  on(id: string): boolean | undefined
}

export const featureState = service<FeatureState>('featureState')

export const featuresList = request('features.list', { input: () => z.object({}), output: type<FeatureChoice>() })

export const featuresSet = request('features.set', { input: () => z.object({ changes: z.record(z.string(), z.boolean()) }), output: type<FeatureChoice>() })
