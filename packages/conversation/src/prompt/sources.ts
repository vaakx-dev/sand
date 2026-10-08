import type { CompletionSource, Suggestion } from '@sand/protocol'
import type { Context } from 'drydock'
import { withDirectories, type FileEntry } from './files'
import { rank } from './rank'

const quote = (entry: FileEntry, quoted: boolean) => {
  if (!quoted && !/\s/.test(entry.path)) return entry.path
  return entry.directory ? `"${entry.path}` : `"${entry.path}"`
}

const skills = (ctx: Context, query: string, trigger?: string): Suggestion[] =>
  (ctx.skillIndex?.list() ?? [])
    .filter(skill => skill.name.toLowerCase().includes(query.toLowerCase()))
    .map(skill => ({ value: skill.name, description: skill.description, group: 'Skills', icon: 'sparkles', ...(trigger && { trigger }) }))

export const commandSource = (ctx: Context): CompletionSource => ({
  trigger: '/',
  pattern: /^\/([\w-]*)$/,
  items: query => [
    ...skills(ctx, query, '$'),
    ...(ctx.commands?.list() ?? [])
      .filter(command => command.name.startsWith(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(command => ({ value: command.name, description: command.description, submit: !command.args?.startsWith('<'), group: 'Commands', icon: 'slash' })),
  ],
  hint: () => (ctx.commands ? 'No commands match' : undefined),
})

const skillSource = (ctx: Context): CompletionSource => ({
  trigger: '$',
  pattern: /(?:^|\s)\$([\w.-]*)$/,
  items: query => skills(ctx, query),
  hint: () => (ctx.skillIndex ? 'No skills match' : undefined),
})

const fileSource = (ctx: Context<'threads'>): CompletionSource => ({
  trigger: '@',
  pattern: /(?:^|\s)@("[^"]*|[^\s"]*)$/,
  async items(typed) {
    if (!ctx.fileIndex) return []
    const quoted = typed.startsWith('"')
    const query = (quoted ? typed.slice(1) : typed).replaceAll('\\', '/')
    const files = await ctx.fileIndex.list(ctx.threads.cwd()).catch(() => [])
    return rank(withDirectories(files), query)
      .slice(0, 10)
      .map(entry => ({ value: quote(entry, quoted), group: 'Files', icon: entry.directory ? 'folder' : 'file', ...(entry.directory && { partial: true }) }))
  },
  hint: () => (ctx.fileIndex ? 'No files match' : undefined),
})

export const builtinSources = (ctx: Context<'threads'>) => [commandSource(ctx), skillSource(ctx), fileSource(ctx)]
