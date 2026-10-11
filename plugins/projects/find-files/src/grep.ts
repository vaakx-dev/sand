import type { PalettePage } from '@sand/palette/contract'
import type { Context } from 'drydock'
import { insertFile } from './insert'

const tooShort = (query: string) => query.trim().length < 2

export const grepPage = (ctx: Context<'threads' | 'fileIndex'>): PalettePage => {
  const cwd = ctx.threads.cwd()
  return {
    id: 'grep',
    title: 'Search in project',
    placeholder: 'Search text in files…',
    empty: query => (tooShort(query) ? '' : 'No matches in this project.'),
    filter: false,
    delay: 150,
    async items(query) {
      if (tooShort(query)) return []
      const matches = await ctx.fileIndex.grep(query.trim(), cwd)
      return matches.map(match => ({
        id: `grep:${match.path}:${match.line}`,
        icon: 'file',
        label: `${match.path}:${match.line}`,
        detail: match.text,
        run: () => insertFile(ctx, match.path),
      }))
    },
  }
}
