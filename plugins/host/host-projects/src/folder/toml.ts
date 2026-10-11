import { isRecord } from '@sand/kit'
import { join } from 'node:path'

export interface ProjectToml {
  name?: string
  setup?: string
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

export const readProjectToml = async (folder: string): Promise<ProjectToml> => {
  try {
    const data: unknown = Bun.TOML.parse(await Bun.file(join(folder, '.sand', 'project.toml')).text())
    if (!isRecord(data)) return {}
    const name = text(data.name)
    const setup = text(data.setup)
    return { ...(name ? { name } : {}), ...(setup ? { setup } : {}) }
  } catch {
    return {}
  }
}
