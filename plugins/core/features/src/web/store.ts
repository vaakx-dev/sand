import { type wire, wireHello } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type FeatureChoice, featuresList, featuresSet } from '../contract'

export const featureStore = (ctx: Context<{ wire: typeof wire }>) => {
  const choice = sig<FeatureChoice | undefined>(undefined)
  const applying = sig<Record<string, boolean> | undefined>(undefined)
  const error = sig('')

  const call = async (work: () => Promise<FeatureChoice>) => {
    error.set('')
    try {
      choice.set(await work())
    } catch (failure) {
      error.set(errorMessage(failure))
    }
  }

  const load = () => call(() => ctx.wire.call(featuresList, {}))
  ctx.on(wireHello, () => void load())
  if (ctx.wire.ready()) void load()

  const apply = async (changes: Record<string, boolean>) => {
    applying.set(changes)
    await call(() => ctx.wire.call(featuresSet, { changes }))
    applying.set(undefined)
  }

  const feature = (id: string) => choice.get()?.features.find(found => found.id === id)

  return { choice, applying, error, feature, apply }
}

export type FeatureStore = ReturnType<typeof featureStore>
