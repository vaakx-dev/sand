import type { ShellEnv } from './contract'

export const shellEnv = () => {
  const entries: { name: string; value: string }[] = []
  const service: ShellEnv = {
    set(name, value) {
      const entry = { name, value }
      entries.push(entry)
      return () => {
        const at = entries.indexOf(entry)
        if (at >= 0) entries.splice(at, 1)
      }
    },
  }
  const values = () => Object.fromEntries(entries.map(({ name, value }) => [name, value]))
  return { service, values }
}
