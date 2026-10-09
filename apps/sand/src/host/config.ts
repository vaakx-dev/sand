import { errorMessage } from '@sand/kit'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

const schema = z.object({
  port: z.number().int().min(0).default(4317),
  name: z.string().optional(),
  watch: z.boolean().default(false),
  drain_minutes: z.number().positive().default(30),
})

const configPath = async (home: string) => {
  const own = join(home, 'sand.toml')
  return (await Bun.file(own).exists()) ? own : join(homedir(), '.sand', 'sand.toml')
}

const hostTable = async (path: string): Promise<unknown> => {
  if (!(await Bun.file(path).exists())) return {}
  try {
    const parsed = Bun.TOML.parse(await Bun.file(path).text()) as Record<string, unknown>
    return parsed.host ?? {}
  } catch (error) {
    throw new Error(`${path}: ${errorMessage(error)}`)
  }
}

export const readHostConfig = async (home: string) => {
  const path = await configPath(home)
  const parsed = schema.safeParse(await hostTable(path))
  if (!parsed.success) throw new Error(`${path} [host]: ${z.prettifyError(parsed.error)}`)
  const { port, name, watch, drain_minutes } = parsed.data
  return { port, name, watch, drainTimeout: drain_minutes * 60_000 }
}
