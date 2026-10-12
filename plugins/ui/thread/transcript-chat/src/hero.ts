import { delayed, pulse, type Pulse } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, p, show } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { idleHints } from './idle'

const size = 96

type Below = 'off' | 'idle' | 'draft'

const typingOff = (ctx: Context<'kit'>) => {
  const { secondaryAction } = ctx.kit
  return div(
    { class: 'mt-4 flex flex-col items-center gap-3' },
    p({ class: 'text-xs text-neutral-500' }, 'Typing is turned off'),
    ctx.commands?.get('extensions') &&
      secondaryAction({ size: 'sm', class: 'pointer-events-auto', onClick: () => void ctx.commands?.run('extensions') }, 'Open Interface'),
  )
}

const currentProject = (ctx: Context<'threads'>) => {
  const cwd = ctx.threads.current()?.info.cwd ?? ctx.threads.cwd()
  if (!cwd) return undefined
  const device = ctx.threads.device()
  const look = ctx.projects?.icon(cwd, device)
  return look && { name: ctx.projects?.name(cwd, device) ?? '', look }
}

const mark = (ctx: Context<'kit' | 'threads'>, changes: Pulse) => {
  const { appIcon, projectAvatar } = ctx.kit
  const project = changes.read(() => currentProject(ctx))
  return dynamicChild(
    project.map(Boolean),
    found =>
      found
        ? projectAvatar(
            project.map(value => value?.name ?? ''),
            project.map(value => value?.look),
            size,
          )
        : appIcon(size),
  )
}

const belowState = (ctx: Context<'threads'>): Below => {
  if (!ctx.composer) return 'off'
  return ctx.threads.idle() ? 'idle' : 'draft'
}

const below = (ctx: Context<'kit' | 'threads'>, state: Below) => {
  if (state === 'off') return typingOff(ctx)
  if (state === 'idle') return idleHints(ctx)
  return null
}

export const hero = (ctx: Context<'kit' | 'threads'>) => {
  const changes = pulse(ctx, ['threads.change', 'thread.select', 'projects.change'], ['threads', 'projects', 'composer', 'commands', 'palette'])
  return div(
    { class: 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 pb-32 text-center' },
    div({ class: 'mx-auto flex opacity-25', style: { filter: 'grayscale(0.35)' } }, mark(ctx, changes)),
    dynamicChild(
      changes.read(() => belowState(ctx)),
      state => below(ctx, state),
    ),
  )
}

export const failed = ({ errorText, secondaryAction }: Kit, message: string, retry: () => void) =>
  div(
    { class: 'mt-3 mb-4 flex flex-col items-center gap-2 text-center' },
    errorText(`Couldn't load this thread: ${message}`),
    secondaryAction({ size: 'sm', onClick: retry }, 'Retry'),
  )

export const loading = ({ hint }: Kit) => div({ class: 'mt-3 mb-4 h-10 text-center' }, show(delayed(true), () => hint('Loading…')))
