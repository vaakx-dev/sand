const settings = {
  web_search: '"disabled"',
  'tools.experimental_request_user_input.enabled': 'false',
  'tools.update_plan.enabled': 'false',
  'skills.include_instructions': 'false',
  'skills.bundled.enabled': 'false',
  notify: '[]',
  developer_instructions: '""',
  project_doc_max_bytes: '0',
  include_permissions_instructions: 'false',
  include_collaboration_mode_instructions: 'false',
  include_environment_context: 'false',
  include_apps_instructions: 'false',
  model_auto_compact_token_limit: '9223372036854775807',
  tool_output_token_limit: '200000',
  'analytics.enabled': 'false',
  'feedback.enabled': 'false',
}

const setting = (key: string, value: string) => ['-c', `${key}=${value}`]

interface ServerArgs {
  catalog?: string
  features: string[]
}

export const plainArgs = ['app-server']

export const sandArgs = ({ catalog, features }: ServerArgs) => [
  'app-server',
  ...features.flatMap(feature => ['--disable', feature]),
  ...Object.entries(settings).flatMap(([key, value]) => setting(key, value)),
  ...(catalog ? setting('model_catalog_json', JSON.stringify(catalog)) : []),
]

export const threadConfig = (mcpServers: string[]) => ({ mcp_servers: Object.fromEntries(mcpServers.map(name => [name, { enabled: false }])) })
