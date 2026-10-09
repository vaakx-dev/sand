import type { Skill } from '@sand/protocol'
import { parseFrontmatter, scanFolder } from '@sand/host'
import { errorMessage } from '@sand/kit'
import { basename, dirname, join } from 'node:path'

const placeholder = /\{\{(\w+)\}\}/g

const fill = (body: string, values: Record<string, string>) => body.replace(placeholder, (found, key: string) => values[key] ?? found)

const parse = async (dir: string, values: Record<string, string> = {}): Promise<Skill> => {
  const { meta, body } = parseFrontmatter(await Bun.file(join(dir, 'SKILL.md')).text())
  return {
    name: String(meta.name ?? basename(dir)),
    description: String(meta.description ?? ''),
    dir,
    body: fill(body, values),
  }
}

const skillDirs = async (root: string) => (await scanFolder(root, '*/SKILL.md')).map(file => join(root, dirname(file)))

const hasSkill = (dir: string) => Bun.file(join(dir, 'SKILL.md')).exists()

const contributedDirs = async (contributed: Map<string, Record<string, string>>) => {
  const dirs = [...contributed.keys()]
  const present = await Promise.all(dirs.map(hasSkill))
  return dirs.filter((_, index) => present[index])
}

export const discover = async (contributed: Map<string, Record<string, string>>, roots: string[], report: (error: unknown) => void) => {
  const found = [...(await contributedDirs(contributed)), ...(await Promise.all(roots.map(skillDirs))).flat()]
  const parsed = await Promise.all(
    found.map(dir =>
      parse(dir, contributed.get(dir)).catch(error => {
        report(new Error(`${join(dir, 'SKILL.md')}: ${errorMessage(error)}`))
        return undefined
      }),
    ),
  )
  const skills = new Map<string, Skill>()
  for (const skill of parsed) if (skill) skills.set(skill.name, skill)
  return [...skills.values()].sort((a, b) => a.name.localeCompare(b.name))
}
