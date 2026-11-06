import { features, type Features } from '@sand/config/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { type FeatureChoice, featuresList, featuresSet } from './contract'

const choiceOf = (found: Features): FeatureChoice => ({ features: found.list(), asked: found.asked() })

export default definePlugin({
  name: 'features',
  description: 'Lists the features and turns them on or off: writes [features] in sand.toml, loads or unloads the host plugins and starts a fresh runtime',
  inject: { hub, features, runtimes },
  apply(ctx) {
    ctx.effect(() => ctx.hub.handle(featuresList, () => choiceOf(ctx.features)))
    ctx.effect(() =>
      ctx.hub.handle(featuresSet, async ({ changes }) => {
        const known = new Set(ctx.features.list().map(feature => feature.id))
        const unknown = Object.keys(changes).filter(id => !known.has(id))
        if (unknown.length) throw new Error(`No such feature: ${unknown.join(', ')}`)
        await ctx.features.set(changes)
        await ctx.runtimes.swap('plugins')
        return choiceOf(ctx.features)
      }),
    )
  },
})
