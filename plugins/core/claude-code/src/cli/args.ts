import type { Effort } from '@sand/protocol'

interface RunOptions {
  model?: string
  effort?: Effort
}

const quiet = {
  CLAUDE_AGENT_SDK_MCP_NO_PREFIX: '1',
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
  CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: '1',
  CLAUDE_CODE_DISABLE_WORKFLOWS: '1',
  CLAUDE_CODE_DISABLE_AGENT_VIEW: '1',
  CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: '1',
  DISABLE_AUTOUPDATER: '1',
}

const sandKeys = new Set(['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'])

export const claudeEnv = (): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined && !sandKeys.has(key)) env[key] = value
  return { ...env, ...quiet }
}

export const claudeArgs = ({ model, effort }: RunOptions) => [
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
  '--no-session-persistence',
  '--disable-slash-commands',
  '--permission-prompt-tool',
  'stdio',
  '--thinking-display',
  'summarized',
  ...(model ? ['--model', model] : []),
  ...(effort ? ['--effort', effort] : []),
]
