import { request, type } from '@sand/host-hub/contract'
import { z } from 'zod'

export const editorIds = ['vscode', 'cursor', 'zed', 'files', 'terminal'] as const

export type EditorId = (typeof editorIds)[number]

export interface Editor {
  id: EditorId
  label: string
}

export const editorsList = request('editors.list', {
  input: z.object({}),
  output: type<Editor[]>(),
})

export const editorOpen = request('editor.open', {
  input: z.object({ cwd: z.string().min(1), editor: z.enum(editorIds) }),
  output: type<void>(),
})
