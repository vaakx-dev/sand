import type { Tool } from '@sand/tools/contract'
import { resolve } from 'node:path'
import { z } from 'zod'
import { exclusive } from './files'

const input = z.object({
  path: z.string().describe('File path, absolute or relative to the working directory'),
  content: z.string().describe('Full file contents'),
})

export const write: Tool<typeof input> = {
  name: 'write',
  description: 'Create or overwrite a file with the given contents. Parent directories are created as needed.',
  input,
  async run({ path, content }, { cwd }) {
    const full = resolve(cwd, path)
    await exclusive(full, () => Bun.write(full, content))
    return `Wrote ${content.split('\n').length} lines to ${path}`
  },
}
