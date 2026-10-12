import { join } from 'node:path'
import { repoDirs } from '../git/repo'
import { junkPatterns } from './builtin'
import { parseIgnore, type IgnoreRule } from './pattern'

interface RuleSet {
  base: string
  newestFirst: IgnoreRule[]
}

export type IgnoreRules = RuleSet[]

const readText = (file: string) => Bun.file(file).text().catch(() => '')

const ruleSet = (base: string, text: string): RuleSet => ({ base, newestFirst: parseIgnore(text).toReversed() })

export const withIgnoreFile = async (stack: IgnoreRules, base: string, file: string): Promise<IgnoreRules> => {
  const added = ruleSet(base, await readText(file))
  return added.newestFirst.length > 0 ? [added, ...stack] : stack
}

export const rootRules = async (folder: string): Promise<IgnoreRules> => {
  const repo = await repoDirs(folder)
  const junk = repo ? [] : junkPatterns
  const exclude = repo ? await readText(join(repo.commonDir, 'info', 'exclude')) : ''
  return [ruleSet('', [...junk, exclude].join('\n'))]
}

export const isIgnored = (stack: IgnoreRules, path: string, name: string, isDir: boolean) => {
  for (const { base, newestFirst } of stack) {
    const relative = path.slice(base.length)
    for (const rule of newestFirst) {
      if (rule.dirOnly && !isDir) continue
      if (rule.regex.test(rule.anchored ? relative : name)) return !rule.negate
    }
  }
  return false
}
