import { isRecord } from '@sand/util'
import type { FeatureDefinition } from '../contract'

const words = (value: unknown) => (Array.isArray(value) ? value.filter(item => typeof item === 'string') : [])

const definitionOf = (id: string, value: unknown): FeatureDefinition[] => {
  if (!isRecord(value) || typeof value.label !== 'string') return []
  const { label, summary, parent, stops } = value
  return [
    {
      id,
      kind: value.kind === 'capability' ? 'capability' : 'feature',
      label,
      summary: typeof summary === 'string' ? summary : '',
      ...(typeof parent === 'string' && { parent }),
      needs: words(value.needs),
      uses: words(value.uses),
      ...(typeof stops === 'string' && { stops }),
    },
  ]
}

export const featureOf = (sand: Record<string, unknown>) => (typeof sand.feature === 'string' ? sand.feature : undefined)

export const definitionsIn = (manifests: Record<string, unknown>[]) =>
  manifests.flatMap(sand => Object.entries(isRecord(sand.features) ? sand.features : {}).flatMap(([id, value]) => definitionOf(id, value)))
