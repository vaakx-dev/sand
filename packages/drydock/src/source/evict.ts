import { sep } from 'node:path'

const normalize = (path: string) => (process.platform === 'win32' ? path.toLowerCase() : path)

export const evict = (dir: string) => {
  const prefix = normalize(dir.endsWith(sep) ? dir : dir + sep)
  for (const key of Object.keys(require.cache)) if (normalize(key).startsWith(prefix)) delete require.cache[key]
}
