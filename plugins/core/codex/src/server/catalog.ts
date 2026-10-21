import { isRecord } from '@sand/util'
import { join } from 'node:path'
import { codexHome } from './binary'

const dropped = ['tool_mode', 'multi_agent_version', 'apply_patch_tool_type', 'web_search_tool_type']

const sandOnly = {
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

export const writeCatalog = async (folder: string) => {
  const cached: unknown = await Bun.file(join(codexHome(), 'models_cache.json'))
    .json()
    .catch(() => undefined)
  const models = isRecord(cached) && Array.isArray(cached.models) ? cached.models.filter(isRecord) : []
  if (!models.length) return undefined
  const path = join(folder, 'codex-models.json')
  await Bun.write(path, JSON.stringify({ models: models.map(withSandTools) }))
  return path
}
