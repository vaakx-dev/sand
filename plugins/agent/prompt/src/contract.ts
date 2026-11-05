import type { ToolSpec } from '@sand/accounts/contract'
import type { Message, Session } from '@sand/chats/contract'
import { event, service } from 'drydock'

export interface ContextBuilder {
  system(session: Session, model: string): Promise<string>
  tools(session: Session, messages: Message[]): ToolSpec[]
}

export const context = service<ContextBuilder>('context')

export const promptSections = event<(sections: string[], session: Session) => string[]>('prompt.sections')
export const promptBase = event<(parts: string[], session: Session) => string[] | Promise<string[]>>('prompt.base')
