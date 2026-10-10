import type { AccountKind, ModelInfo } from '../contract'
import { claudeModels, describeClaude, knownClaude } from '../claude/models'
import { codexModels, describeCodex, takesImages } from '../codex/models'
import type { Discovered } from '../discover'

type Described = Omit<ModelInfo, 'id'>

interface Family {
  names: string[]
  known(name: string): boolean
  describe(name: string): Described
}

const claudeFamily: Family = {
  names: claudeModels,
  known: knownClaude,
  describe: name => ({ ...describeClaude(name), images: true }),
}

const codexFamily: Family = {
  names: codexModels,
  known: name => codexModels.includes(name),
  describe: name => ({ ...describeCodex(name), images: takesImages(name) }),
}

const families: Partial<Record<AccountKind, Family>> = { claude: claudeFamily, anthropic: claudeFamily, codex: codexFamily, openai: codexFamily }

export const builtinNames = (kind: AccountKind) => families[kind]?.names ?? []

export const hasBuiltin = (kind: AccountKind) => !!families[kind]

const defined = (found: Discovered): Partial<Described> => {
  const { name: _, price: __, ...rest } = found
  return Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined))
}

export const describe = (kind: AccountKind, found: Discovered): Described => {
  const family = families[kind]
  const plain: Described = { label: found.name, efforts: [] }
  if (!family) return { ...plain, ...defined(found) }
  const own = family.describe(found.name)
  return family.known(found.name) ? { ...defined(found), ...own } : { ...own, ...defined(found) }
}

export const builtinRank = (kind: AccountKind, name: string) => {
  const index = builtinNames(kind).indexOf(name)
  return index < 0 ? Infinity : index
}
