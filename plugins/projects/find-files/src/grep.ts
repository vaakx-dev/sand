import type { PalettePage } from '@sand/protocol'
import type { Context } from 'drydock'
import { insertFile } from './insert'

export const grepPage = (ctx: Context<'threads' | 'fileIndex'>): PalettePage => {
  const cwd = ctx.threads.cwd()
  return {
    id: 'grep',
    title: 'Search in project',
    placeholder: 'Search text in files…',
    empty: query => (query.trim().length < 2 ? '' : 'No matches in this project.'),
    filter: false,
    delay: 150,
    async items(query) {
      if (query.trim().length < 2) return []
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
