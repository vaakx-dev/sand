import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { isSecret, junkPatterns } from '../folder/exclude'

const maxDepth = 3
const maxEntries = 3000
const pruned = new Set(['.git', ...junkPatterns.map(pattern => pattern.replace(/\/$/, ''))])

export const findSecrets = async (folder: string) => {
  const found: string[] = []
  let seen = 0
  let level = ['']
  for (let depth = 0; depth < maxDepth && level.length > 0 && seen < maxEntries; depth++) {
    const next: string[] = []
    for (const relative of level) {
      const entries = await readdir(join(folder, relative), { withFileTypes: true }).catch(() => [])
      for (const entry of entries) {
        if (++seen > maxEntries) return found
        const path = join(relative, entry.name)
        if (entry.isDirectory()) {
          if (!pruned.has(entry.name)) next.push(path)
        } else if (isSecret(entry.name)) found.push(path)
      }
    }
    level = next
  }
  return found
}
