import type { LLMRequest } from '@sand/llm-accounts/contract'
import type { Session } from '@sand/sessions-sqlite/contract'

export interface ContextBuilder {
  build(session: Session): Promise<LLMRequest>
}

export interface Instructions {
  environment(cwd: string, model?: string): string
  project(cwd: string, project?: string | null): Promise<string>
}

declare module 'drydock' {
  interface Services {
    context: ContextBuilder
    instructions: Instructions
  }
}
