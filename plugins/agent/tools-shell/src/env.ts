import type { ShellEnv } from './contract'

export const shellEnv = () => {
  const entries = new Set<{ name: string; value: string }>()
  const service: ShellEnv = {
    set(name, value) {
      const entry = { name, value }
      entries.add(entry)
      return () => {
        entries.delete(entry)
      }
    },
  }
  const values = () => Object.fromEntries([...entries].map(({ name, value }) => [name, value]))
  return { service, values }
}
