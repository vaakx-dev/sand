const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export const parseFrontmatter = (text: string) => {
  const match = frontmatter.exec(text)
  const meta = (match ? Bun.YAML.parse(match[1]!) : {}) as Record<string, unknown>
  return { meta, body: (match ? match[2]! : text).trim() }
}
