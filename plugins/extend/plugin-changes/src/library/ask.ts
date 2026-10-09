import type { PluginEntry } from '@sand/host-plugin-library/contract'
import type { Context } from 'drydock'

const snapshotLine = (plugin: PluginEntry) =>
  plugin.base
    ? `- The built-in as I copied it: ${plugin.base}`
    : `- The built-in as I copied it isn't on this PC, because the copy came from another PC${plugin.from?.version ? ` (sand ${plugin.from.version})` : ''}. Work from the current built-in instead.`

export const askPrompt = (plugin: PluginEntry) =>
  [
    `My sand plugin "${plugin.name}" is a customised copy of the built-in plugin of the same name, and the built-in has changed since I copied it${plugin.from?.version ? ` from sand ${plugin.from.version}` : ''}.`,
    '',
    snapshotLine(plugin),
    `- The built-in now: ${plugin.builtin ?? 'not found'}`,
    `- My copy: ${plugin.folder}`,
    '',
    'Compare these folders (skip node_modules) and tell me:',
    '1. What changed in the built-in since I copied it.',
    '2. How my copy differs from the built-in as I copied it.',
    '3. A few ways to combine them, and what each one keeps or drops.',
    '',
    "Don't change any files until I tell you which way to go. When we do change something, only edit my copy, never the built-in.",
  ].join('\n')

export const askSand = async (ctx: Context<'wire'>, root: string, plugin: PluginEntry) => {
  const threads = ctx.threads
  if (!threads) throw new Error('Threads are not available')
  const prompt = askPrompt(plugin)
  ctx.settings?.close()
  if (ctx.composer) {
    await threads.draft(root)
    ctx.composer.set(prompt)
    ctx.composer.focus()
    return
  }
  if (!ctx.turns) throw new Error('Agent turns are not available')
  const thread = await threads.create({ cwd: root, title: `Combine ${plugin.name} with the built-in`, settings: ctx.models?.draft() })
  await ctx.turns.send(thread.id, prompt)
  await threads.select(thread.id)
}
