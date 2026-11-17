import { join } from 'node:path'
import { z } from 'zod'

const cacheSchema = z.object({ models: z.array(z.unknown()) })

const modelSchema = z.record(z.string(), z.unknown())

type Json = z.infer<typeof modelSchema>

const dropped = ['tool_mode', 'multi_agent_version', 'apply_patch_tool_type', 'web_search_tool_type']

const sandOnly = {
  shell_type: 'disabled',
  experimental_supported_tools: [],
  supports_search_tool: false,
  include_skills_usage_instructions: false,
  include_plugin_usage_instructions: false,
  include_apps_usage_instructions: false,
}

const withSandTools = (model: Record<string, unknown>) => ({
  ...Object.fromEntries(Object.entries(model).filter(([key]) => !dropped.includes(key))),
  ...sandOnly,
})

export const writeCatalog = async (folder: string, home: string) => {
  const cached: unknown = await Bun.file(join(home, 'models_cache.json'))
    .json()
    .catch(() => undefined)
  const models = (cacheSchema.safeParse(cached).data?.models ?? []).filter((model): model is Json => modelSchema.safeParse(model).success)
  if (!models.length) return undefined
  const path = join(folder, 'codex-models.json')
  await Bun.write(path, JSON.stringify({ models: models.map(withSandTools) }))
  return path
}
