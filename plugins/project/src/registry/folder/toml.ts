import { join } from 'node:path'
import { z } from 'zod'

export interface ProjectToml {
  name?: string
  setup?: string
}

const text = z
  .string()
  .transform(value => value.trim() || undefined)
  .catch(undefined)

const projectToml = z.object({ name: text, setup: text })

export const readProjectToml = async (folder: string): Promise<ProjectToml> => {
  try {
    const { name, setup } = projectToml.parse(Bun.TOML.parse(await Bun.file(join(folder, '.sand', 'project.toml')).text()))
    return { ...(name ? { name } : {}), ...(setup ? { setup } : {}) }
  } catch {
    return {}
  }
}
