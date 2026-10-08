import { appIcon, delayed, div, dynamicChild, img, p, pulse, secondaryAction, show, span } from '@sand/dom'
import type { Context } from 'drydock'
import { idleHints } from './idle'

const size = 96

const typingOff = (ctx: Context) =>
  div(
    { class: 'mt-4 flex flex-col items-center gap-3' },
    p({ class: 'text-xs text-neutral-500' }, 'Typing is turned off.'),
    ctx.commands?.get('extensions') &&
      secondaryAction({ size: 'sm', class: 'pointer-events-auto', onClick: () => void ctx.commands?.run('extensions') }, 'Open Interface'),
  )

const projectIconUrl = (ctx: Context) => {
  const threads = ctx.threads
  if (!threads) return ''
  const cwd = threads.current()?.info.cwd ?? threads.cwd()
  if (!cwd || !ctx.projects) return ''
  const device = threads.device()
  const locations = ctx.projects.group(cwd, device)?.locations ?? []
  return ctx.projects.icon(cwd, device) ?? locations.map(location => ctx.projects?.icon(location.path, location.device)).find(Boolean) ?? ''
}

const mark = (url: string) =>
  url
    ? img({ src: url, alt: '', width: size, height: size, draggable: false, class: 'shrink-0 rounded-2xl object-contain' })
    : appIcon(size)

const below = (ctx: Context<'threads'>, state: 'off' | 'idle' | 'draft') =>
  state === 'off' ? typingOff(ctx) : state === 'idle' ? idleHints(ctx) : span()

export const hero = (ctx: Context<'threads'>) => {
  const changes = pulse(ctx, ['threads.change', 'thread.select', 'projects.change'], ['threads', 'projects', 'composer', 'commands', 'palette'])
  return div(
    { class: 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 pb-32 text-center' },
    div({ class: 'mx-auto flex opacity-25', style: { filter: 'grayscale(0.35)' } }, dynamicChild(changes.read(() => projectIconUrl(ctx)), mark)),
    dynamicChild(
      changes.read(() => (!ctx.composer ? 'off' : ctx.threads.idle() ? 'idle' : 'draft')),
      state => below(ctx, state),
    ),
  )
}

export const failed = (message: string, retry: () => void) =>
  div(
    { class: 'mt-3 mb-4 flex flex-col items-center gap-2 text-center text-xs text-neutral-500' },
    span(`Couldn't load this thread: ${message}`),
    secondaryAction({ size: 'sm', onClick: retry }, 'Retry'),
  )

export const loading = () => div({ class: 'mt-3 mb-4 h-4 text-center text-xs text-neutral-500' }, show(delayed(true), () => span('Loading…')))
