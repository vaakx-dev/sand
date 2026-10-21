export type LiveEvent =
  | { type: 'start'; model: string }
  | { type: 'text'; index: number; text: string }
  | { type: 'thinking'; index: number; text: string }
  | { type: 'tool_call'; index: number; id: string; name: string }
  | { type: 'tool_input'; index: number; json: string }
  | { type: 'block'; index: number }
  | { type: 'done' }

export type LiveBlock =
  | { type: 'text' | 'thinking'; index: number; text: string; done?: boolean }
  | { type: 'tool'; index: number; id: string; name: string; input: string }
