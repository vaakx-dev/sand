import type { Effort } from '@sand/accounts/contract'

export interface Saved {
  id: string
  start: 'new' | 'resume' | 'fork'
}

interface RunOptions {
  model?: string
  effort?: Effort
  saved?: Saved
}

const kept = (saved?: Saved) => {
  if (!saved) return ['--no-session-persistence']
  switch (saved.start) {
    case 'new':
      return ['--session-id', saved.id]
    case 'resume':
      return ['--resume', saved.id]
    case 'fork':
      return ['--resume', saved.id, '--fork-session', '--no-session-persistence']
  }
}

const locked = {
  CLAUDE_AGENT_SDK_MCP_NO_PREFIX: '1',
  CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1',
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
  CLAUDE_CODE_DISABLE_ATTACHMENTS: '1',
  CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: '1',
  CLAUDE_CODE_DISABLE_WORKFLOWS: '1',
  CLAUDE_CODE_DISABLE_AGENT_VIEW: '1',
  CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: '1',
  CLAUDE_CODE_DISABLE_ADVISOR_TOOL: '1',
  CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK: '1',
  CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK: '1',
  CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: '1',
  CLAUDE_CODE_ENABLE_AWAY_SUMMARY: '0',
  DISABLE_AUTO_COMPACT: '1',
  DISABLE_AUTOUPDATER: '1',
  DISABLE_TELEMETRY: '1',
  DISABLE_ERROR_REPORTING: '1',
  ENABLE_CLAUDEAI_MCP_SERVERS: 'false',
  ENABLE_TOOL_SEARCH: 'false',
  MAX_MCP_OUTPUT_TOKENS: '200000',
}

const dropped = new Set(['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_SIMPLE', 'CLAUDE_CODE_EFFORT_LEVEL', 'MCP_TOOL_TIMEOUT'])

const settings = { disableAllHooks: true }

export const claudeEnv = (): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined && !dropped.has(key)) env[key] = value
  return { ...env, ...locked }
}

export const claudeArgs = ({ model, effort, saved }: RunOptions) => [
  '-p',
  '--input-format',
  'stream-json',
  '--output-format',
  'stream-json',
  '--verbose',
  '--include-partial-messages',
  '--tools',
  '',
  '--strict-mcp-config',
  '--setting-sources',
  '',
  '--settings',
  JSON.stringify(settings),
  ...kept(saved),
  '--disable-slash-commands',
  '--permission-mode',
  'default',
  '--permission-prompt-tool',
  'stdio',
  '--thinking-display',
  'summarized',
  ...(model ? ['--model', model] : []),
  ...(effort ? ['--effort', effort] : []),
]
