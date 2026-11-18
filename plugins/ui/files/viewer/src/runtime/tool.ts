import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'

const input = z.object({
  path: z.string().min(1).describe('The file to show: absolute, relative to the thread folder, or a name the thread has used'),
})

const DESCRIPTION =
  "Open a file in the user's file viewer beside the chat. Text, code, Markdown, images, audio and video always open; other formats need their add-on."

const showTool = (show: (thread: string, cwd: string, path: string) => Promise<string>): Tool<typeof input> => ({
  name: 'file_show',
  group: 'files',
  description: DESCRIPTION,
  input,
  effect: 'read',
  needs: ['thread'],
  run: ({ path }, { conversation, cwd }) => show(conversation.id, cwd, path),
})

export { showTool }
