import type { PalettePage } from '@sand/palette/contract'
import { matching } from '@sand/dom'
import { folderName } from '@sand/kit'
import type { Context } from 'drydock'
import { insertFile } from './insert'

export const filesPage = (ctx: Context<'threads' | 'fileIndex'>): PalettePage => {
  const cwd = ctx.threads.cwd()
  const listed = ctx.fileIndex.list(cwd)
  return {
    id: 'files',
    title: 'Go to file',
    placeholder: 'Search files…',
    empty: 'No matching files.',
    filter: false,
    async items(query) {
      const files = await listed
      return matching(files, query, true)
        .slice(0, 50)
        .map(index => files[index]!)
        .map(path => ({
          id: `file:${path}`,
          icon: 'file',
          label: folderName(path),
          detail: path,
          run: () => insertFile(ctx, path),
        }))
    },
  }
}
