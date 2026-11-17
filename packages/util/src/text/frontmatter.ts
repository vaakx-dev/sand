const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export const parseFrontmatter = (text: string): { meta: Record<string, unknown>; body: string } => {
  const match = frontmatter.exec(text)
  if (!match) return { meta: {}, body: text.trim() }
  const meta = Bun.YAML.parse(match[1]!)
  return { meta: meta && typeof meta === 'object' ? Object.fromEntries(Object.entries(meta)) : {}, body: match[2]!.trim() }
}
