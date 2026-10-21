import { palette } from '@sand/palette/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange } from '@sand/web-client/contract'
import { pulse, type Pulse } from '@sand/web-client/reactive'
import { div, dynamicChild, show } from '@vaakx-dev/vrui'
import type { ChatContext } from './context'
import { idleHints } from './idle'

const size = 96

const currentProject = (ctx: ChatContext) => {
  const cwd = ctx.threads.current()?.info.cwd ?? ctx.threads.cwd()
  if (!cwd) return undefined
  const device = ctx.threads.device()
  const found = ctx.get(projects)
  const look = found?.icon(cwd, device)
  return look && { name: found?.name(cwd, device) ?? '', look }
}

const mark = (ctx: ChatContext, changes: Pulse) => {
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



export const hero = (ctx: ChatContext) => {
  const changes = pulse(ctx, [threadsChange, threadSelect, projectsChange], [threads, projects, palette])
  return div(
    { class: 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 pb-32 text-center' },
    div({ class: 'mx-auto flex opacity-25', style: { filter: 'grayscale(0.35)' } }, mark(ctx, changes)),
    dynamicChild(
      changes.read(() => !ctx.threads.current()),
      idle => (idle ? idleHints(ctx) : null),
    ),
  )
}

export const failed = ({ errorText, secondaryAction }: Kit, message: string, retry: () => void) =>
  div(
    { class: 'mt-3 mb-4 flex flex-col items-center gap-2 text-center' },
    errorText(`Couldn't load this chat: ${message}`),
    secondaryAction({ size: 'sm', onClick: retry }, 'Retry'),
  )

export const loading = ({ delayed, hint }: Kit) => div({ class: 'mt-3 mb-4 h-10 text-center' }, show(delayed(true), () => hint('Loading…')))
