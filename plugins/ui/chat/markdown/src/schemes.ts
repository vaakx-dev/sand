import type { LinkScheme, MarkdownLinks } from './contract'

export type FindScheme = (name: string) => LinkScheme | undefined

export const linkSchemes = (): MarkdownLinks & { find: FindScheme } => {
  const registered = new Set<LinkScheme>()
  return {
    scheme(entry) {
      registered.add(entry)
      return () => void registered.delete(entry)
    },
    find: name => [...registered].find(entry => entry.scheme.toLowerCase() === name),
  }
}
