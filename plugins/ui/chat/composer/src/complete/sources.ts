import { skillIndex } from '@sand/web-client/contract'
import type { ComposerContext } from '../context'
import { fileSource } from './files'
import type { CompletionSource } from './model'

const skillSource = (ctx: ComposerContext): CompletionSource => ({
  trigger: '$',
  label: 'skills',
  ready: () => Boolean(ctx.get(skillIndex)),
  pattern: /(?:^|\s)\$([\w.-]*)$/,
  items: query =>
    (ctx.get(skillIndex)?.list() ?? [])
      .filter(skill => skill.name.toLowerCase().includes(query.toLowerCase()))
      .map(skill => ({ value: skill.name, description: skill.description, group: 'Skills' })),
  hint: () => (ctx.get(skillIndex) ? 'No matching skills.' : undefined),
})

export const builtinSources = (ctx: ComposerContext) => [skillSource(ctx), fileSource(ctx)]
