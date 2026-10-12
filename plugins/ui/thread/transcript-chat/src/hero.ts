import { appIcon, delayed, div, dynamicChild, errorText, hint, img, p, pulse, secondaryAction, show } from '@sand/dom'
import type { Context } from 'drydock'
import { idleHints } from './idle'

const size = 96

type Below = 'off' | 'idle' | 'draft'

const typingOff = (ctx: Context) =>
  div(
    { class: 'mt-4 flex flex-col items-center gap-3' },
    p({ class: 'text-xs text-neutral-500' }, 'Typing is turned off'),
    ctx.commands?.get('extensions') &&
      secondaryAction({ size: 'sm', class: 'pointer-events-auto', onClick: () => void ctx.commands?.run('extensions') }, 'Open Interface'),
  )

const projectIconUrl = (ctx: Context<'threads'>) => {
  const cwd = ctx.threads.current()?.info.cwd ?? ctx.threads.cwd()
  return (cwd && ctx.projects?.icon(cwd, ctx.threads.device())) || ''
}

const mark = (url: string) => {
  if (!url) return appIcon(size)
  return img({ src: url, alt: '', width: size, height: size, draggable: false, class: 'shrink-0 rounded-2xl' })
}

const belowState = (ctx: Context<'threads'>): Below => {
  if (!ctx.composer) return 'off'
  return ctx.threads.idle() ? 'idle' : 'draft'
}

const below = (ctx: Context<'threads'>, state: Below) => {
  if (state === 'off') return typingOff(ctx)
  if (state === 'idle') return idleHints(ctx)
  return null
}

export const hero = (ctx: Context<'threads'>) => {
  const changes = pulse(ctx, ['threads.change', 'thread.select', 'projects.change'], ['threads', 'projects', 'composer', 'commands', 'palette'])
  return div(
    { class: 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 pb-32 text-center' },
    div({ class: 'mx-auto flex opacity-25', style: { filter: 'grayscale(0.35)' } }, dynamicChild(changes.read(() => projectIconUrl(ctx)), mark)),
    dynamicChild(
      changes.read(() => belowState(ctx)),
      state => below(ctx, state),
    ),
  )
}

export const failed = (message: string, retry: () => void) =>
  div(
    { class: 'mt-3 mb-4 flex flex-col items-center gap-2 text-center' },
    errorText(`Couldn't load this thread: ${message}`),
    secondaryAction({ size: 'sm', onClick: retry }, 'Retry'),
  )

export const loading = () => div({ class: 'mt-3 mb-4 h-10 text-center' }, show(delayed(true), () => hint('Loading…')))
