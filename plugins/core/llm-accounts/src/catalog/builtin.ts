import type { ModelInfo, PlanApi } from '../contract'
import { claudeModels, describeClaude, knownClaude } from '../claude/models'
import type { Discovered } from '../discover'
import { describeOpenAI, openaiModels, takesImages } from '../openai/models'

type Described = Omit<ModelInfo, 'id'>

interface Family {
  names: string[]
  known(name: string): boolean
  describe(name: string): Described
}

const families: Record<PlanApi, Family> = {
  anthropic: {
    names: claudeModels,
    known: knownClaude,
    describe: name => ({ ...describeClaude(name), images: true }),
  },
  openai: {
    names: openaiModels,
    known: name => openaiModels.includes(name),
    describe: name => ({ ...describeOpenAI(name), images: takesImages(name) }),
  },
}

export const builtinNames = (api?: PlanApi) => (api ? families[api].names : [])

const defined = (found: Discovered): Partial<Described> => {
  const { name: _, price: __, ...rest } = found
  return Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined))
}

export const describe = (api: PlanApi | undefined, found: Discovered): Described => {
  const plain: Described = { label: found.name, efforts: [] }
  if (!api) return { ...plain, ...defined(found) }
  const family = families[api]
  const own = family.describe(found.name)
  return family.known(found.name) ? { ...defined(found), ...own } : { ...own, ...defined(found) }
}

export const builtinRank = (api: PlanApi | undefined, name: string) => {
  const index = builtinNames(api).indexOf(name)
  return index < 0 ? Infinity : index
}
