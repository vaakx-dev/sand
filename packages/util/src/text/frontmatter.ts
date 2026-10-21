import { isRecord } from '../json/record'

const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export const parseFrontmatter = (text: string): { meta: Record<string, unknown>; body: string } => {
  const match = frontmatter.exec(text)
  if (!match) return { meta: {}, body: text.trim() }
  const meta: unknown = Bun.YAML.parse(match[1]!)
  return { meta: isRecord(meta) ? meta : {}, body: match[2]!.trim() }
}
