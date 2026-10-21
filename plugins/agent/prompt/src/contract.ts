import type { LLMRequest } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { event, service } from 'drydock'

export interface ContextBuilder {
  build(session: Session): Promise<LLMRequest>
}

export interface Instructions {
  environment(session: Session, model?: string): string
  project(cwd: string, project?: string | null): Promise<string>
}

export const context = service<ContextBuilder>('context')
export const instructions = service<Instructions>('instructions')

export const promptSections = event<(sections: string[], session: Session) => string[]>('prompt.sections')
