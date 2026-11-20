import type { Role } from './contract'

const LEAD = [
  'claude/claude-opus-5-5',
  'codex/gpt-6-luna',
  'anthropic/claude-opus-5-5',
  'openai/gpt-6-luna',
  'openrouter/anthropic/claude-opus-5.5',
  'claude/claude-sonnet-5-5',
  'anthropic/claude-sonnet-5-5',
]

const BUILDER = [
  'claude/claude-sonnet-5-5',
  'codex/gpt-6-luna',
  'anthropic/claude-sonnet-5-5',
  'openai/gpt-6-luna',
  'openrouter/anthropic/claude-sonnet-5.5',
  ...LEAD,
]

const FINDER = [
  'claude/claude-haiku-5-5',
  'anthropic/claude-haiku-5-5',
  'openrouter/anthropic/claude-haiku-5.5',
  'openrouter/deepseek/deepseek-v4.1-flash-1017',
  'openrouter/z-ai/glm-5.3-flash',
  ...BUILDER,
]

const RANKING: Record<Role, string[]> = { lead: LEAD, builder: BUILDER, finder: FINDER }

export { RANKING }
