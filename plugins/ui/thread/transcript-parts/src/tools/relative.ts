const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const folderPattern = ([first, ...rest]: string[]) => {
  const drive = /^([a-z]):$/i.exec(first ?? '')?.[1]
  const root = drive ? `(?:${drive}:|/${drive})` : `/${escape(first ?? '')}`
  return `(?<![\\w\\\\/])${[root, ...rest.map(escape)].join('[\\\\/]')}`
}

export const relativeTo = (cwd: string | undefined, text: string) => {
  const parts = cwd?.split(/[\\/]+/).filter(Boolean) ?? []
  if (!parts.length) return text
  const folder = folderPattern(parts)
  const caseless = /^[a-z]:$/i.test(parts[0] ?? '') ? 'i' : ''
  return text
    .replace(new RegExp(`^cd\\s+(["']?)${folder}[\\\\/]?\\1\\s*(?:&&|;)\\s*`, caseless), '')
    .replace(new RegExp(`${folder}[\\\\/]`, `g${caseless}`), '')
    .replace(new RegExp(`${folder}(?=["'\\s]|$)`, `g${caseless}`), '.')
}
