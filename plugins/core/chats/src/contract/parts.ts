import type { DocumentBlock, FileBlock, ImageBlock } from './message'

export interface Feedback {
  source: string
  text: string
}

export type UserPart =
  | { kind: 'text'; text: string }
  | { kind: 'image'; block: ImageBlock }
  | { kind: 'document'; block: DocumentBlock }
  | { kind: 'file'; block: FileBlock }
  | { kind: 'skill'; name: string }
  | { kind: 'feedback'; feedback: Feedback }
