import { claudeModels } from './claude/models'
import { codexModels } from './codex/models'

export const config = {
  claude_models: claudeModels,
  codex_models: codexModels,
  max_tokens: 64_000,
  thinking: undefined as 'summarized' | 'omitted' | undefined,
  max_retries: 4,
}

export type AccountsConfig = typeof config
