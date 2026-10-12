const disabled = [
  'shell_tool',
  'unified_exec',
  'view_image',
  'goals',
  'apps',
  'plugins',
  'tool_suggest',
  'multi_agent',
  'multi_agent_v2',
  'image_generation',
  'sleep_tool',
  'browser_use',
  'computer_use',
  'hooks',
  'skill_search',
  'memories',
  'code_mode_host',
]

const settings = {
  web_search: '"disabled"',
  'tools.experimental_request_user_input.enabled': 'false',
  'tools.update_plan.enabled': 'false',
  'skills.include_instructions': 'false',
  'skills.bundled.enabled': 'false',
  notify: '[]',
  project_doc_max_bytes: '0',
  include_permissions_instructions: 'false',
  include_collaboration_mode_instructions: 'false',
  include_environment_context: 'false',
  include_apps_instructions: 'false',
}

const setting = (key: string, value: string) => ['-c', `${key}=${value}`]

const keyPart = (name: string) => (/^[\w-]+$/.test(name) ? name : JSON.stringify(name))

interface ServerArgs {
  catalog?: string
  mcpServers: string[]
}

export const plainArgs = ['app-server']

export const sandArgs = ({ catalog, mcpServers }: ServerArgs) => [
  'app-server',
  ...disabled.flatMap(feature => ['--disable', feature]),
  ...Object.entries(settings).flatMap(([key, value]) => setting(key, value)),
  ...mcpServers.flatMap(name => setting(`mcp_servers.${keyPart(name)}.enabled`, 'false')),
  ...(catalog ? setting('model_catalog_json', JSON.stringify(catalog)) : []),
]
