import type { AskRequest } from '@sand/ask/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { type SessionSettings, sessionSettings } from '@sand/model/contract'
import { lazy } from '@sand/util'
import { service } from 'drydock'
import { z } from 'zod'

export const tiers = ['fast', 'smart'] as const

export type Tier = (typeof tiers)[number]

export interface JobRequest extends Omit<AskRequest, 'model' | 'effort' | 'speed'> {
  tier: Tier
}

export interface SubModel {
  has(tier: Tier): boolean
  settings(tier: Tier): SessionSettings
  text(request: JobRequest): Promise<string>
  json<S extends z.ZodType>(request: JobRequest, schema: S): Promise<z.infer<S>>
}

export const subModel = service<SubModel>('subModel')

export const chosenModel = lazy(() => sessionSettings().required({ model: true }))

export type ChosenModel = z.output<ReturnType<typeof chosenModel>>

export interface SubModelState {
  models: Partial<Record<Tier, ChosenModel>>
}

export const helloSubModel = helloField<SubModelState>('subModel')

export const subModelChange = wireEvent<SubModelState>('subModel.change')

export const subModelSet = request('subModel.set', {
  input: () => z.object({ tier: z.enum(tiers), model: chosenModel().nullable() }),
  output: type<void>(),
})
