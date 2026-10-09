import type { Tool } from '@sand/protocol'
import { z } from 'zod'
import { locate } from './files'
import { exclusive } from './lock'

const input = z.object({
  path: z.string().describe('File path, absolute or relative to the working directory'),
  content: z.string().describe('Full file contents'),
})

export const write: Tool<typeof input> = {
  name: 'write',
  description: 'Create or overwrite a file with the given contents. Parent directories are created as needed.',
  input,
  async run({ path, content }, { cwd }) {
    await Bun.write(locate(cwd, path), content)
    return `Wrote ${content.split('\n').length} lines to ${path}`
  },
}
