import type { Context } from 'drydock'
import { fileSource } from './files'
import type { CompletionSource, Suggestion } from './model'

const skills = (ctx: Context, query: string, trigger?: string): Suggestion[] =>
  (ctx.skillIndex?.list() ?? [])
    .filter(skill => skill.name.toLowerCase().includes(query.toLowerCase()))
    .map(skill => ({ value: skill.name, description: skill.description, group: 'Skills', icon: 'sparkles', ...(trigger && { trigger }) }))

const commands = (ctx: Context, query: string): Suggestion[] =>
  (ctx.commands?.list() ?? [])
    .filter(command => command.name.startsWith(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(command => ({ value: command.name, description: command.description, submit: !command.args?.startsWith('<'), group: 'Commands', icon: 'slash' }))

const commandSource = (ctx: Context): CompletionSource => ({
  trigger: '/',
  pattern: /^\/([\w-]*)$/,
  items: query => [...skills(ctx, query, '$'), ...commands(ctx, query)],
  hint: () => (ctx.commands ? 'No commands match' : undefined),
})

const skillSource = (ctx: Context): CompletionSource => ({
  trigger: '$',
  pattern: /(?:^|\s)\$([\w.-]*)$/,
  items: query => skills(ctx, query),
  hint: () => (ctx.skillIndex ? 'No skills match' : undefined),
})

export const builtinSources = (ctx: Context<'threads'>) => [commandSource(ctx), skillSource(ctx), fileSource(ctx)]
