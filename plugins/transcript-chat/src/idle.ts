import { folderName } from '@sand/kit'
import { div, isMac, p, rowButton, span, type Child } from '@sand/dom'
import type { Context } from 'drydock'

const keycap = (label: string) =>
  span(
    { class: 'inline-flex h-5 min-w-5 items-center justify-center rounded border border-b-2 border-neutral-700 bg-neutral-800 px-1 font-mono text-xs text-neutral-400' },
    label,
  )

const hint = (keys: string[], label: Child, run: () => void) =>
  rowButton(
    { class: 'pointer-events-auto gap-3 rounded-lg px-2 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200', onClick: run },
    span({ class: 'flex w-16 shrink-0 justify-end gap-1' }, ...keys.map(keycap)),
    span({ class: 'truncate' }, label),
  )

const projectName = (ctx: Context<'threads'>) => {
  const cwd = ctx.threads.cwd()
  return (cwd && (ctx.projects?.group(cwd, ctx.threads.device())?.name || folderName(cwd))) || 'sand'
}

export const idleHints = (ctx: Context<'threads'>) => {
  const palette = ctx.palette
  const composer = ctx.composer
  return div(
    { class: 'mt-6 flex flex-col items-center gap-2' },
    p({ class: 'text-sm text-neutral-200' }, 'No thread open'),
    div(
      { class: 'mt-2 flex flex-col items-stretch' },
      palette && hint([isMac() ? '⌘' : 'Ctrl', 'K'], 'Search threads, projects and commands', () => palette.open()),
      composer && hint(['Type'], `Start a thread in ${projectName(ctx)}`, () => composer.focus()),
    ),
  )
}
