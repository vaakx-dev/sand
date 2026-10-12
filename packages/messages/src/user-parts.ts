import type { DocumentBlock, FileBlock, ImageBlock } from './message'

export interface Feedback {
  source: string
  text: string
}

export type JobKind = 'agent' | 'workflow' | 'shell'

export interface Notification {
  job: string
  kind: JobKind
  label: string
  status: string
  result: string
}

export type UserPart =
  | { kind: 'text'; text: string }
  | { kind: 'image'; block: ImageBlock }
  | { kind: 'document'; block: DocumentBlock }
  | { kind: 'file'; block: FileBlock }
  | { kind: 'skill'; name: string }
  | { kind: 'notification'; notification: Notification }
  | { kind: 'feedback'; feedback: Feedback }
