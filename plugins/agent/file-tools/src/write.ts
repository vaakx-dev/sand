import type { Tool } from '@sand/tools/contract'
import { resolve } from 'node:path'
import { z } from 'zod'
import { encode, exclusive, savedEncoding } from './files'

const input = z.object({
  path: z.string().describe('File path, absolute or relative to the working directory'),
  content: z.string().describe('Full file contents'),
})

const writeKeepingEncoding = async (path: string, content: string) => {
  const encoded = encode({ content, encoding: await savedEncoding(path) })
  if (encoded.error !== undefined) throw new Error(`Can't write ${path}: ${encoded.error}`)
  await Bun.write(path, encoded.bytes)
}

export const write: Tool<typeof input> = {
  name: 'write',
  description: 'Create or overwrite a file with the given contents. Parent directories are created as needed.',
  input,
  needs: ['pc'],
  act: ({ path }) => ({ effect: 'write', paths: [path], summary: `Write ${path}` }),
  async run({ path, content }, { cwd }) {
    const full = resolve(cwd, path)
    await exclusive(full, () => writeKeepingEncoding(full, content))
    return `Wrote ${content.split('\n').length} lines to ${path}`
  },
}
