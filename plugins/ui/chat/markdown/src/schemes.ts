import type { LinkScheme, MarkdownLinks } from './contract'

export type FindScheme = (name: string) => LinkScheme | undefined

export const linkSchemes = (): MarkdownLinks & { find: FindScheme } => {
  const registered = new Set<LinkScheme>()
  return {
    scheme(entry) {
      registered.add(entry)
      return () => void registered.delete(entry)
    },
    find(name) {
      let best: LinkScheme | undefined
      for (const entry of registered) {
        if (entry.scheme.toLowerCase() !== name || (best && (best.order ?? 0) <= (entry.order ?? 0))) continue
        best = entry
      }
      return best
    },
  }
}
