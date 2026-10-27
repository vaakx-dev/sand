import { palette } from '@sand/palette/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange } from '@sand/web-client/contract'
import { pulse, type Pulse } from '@sand/web-client/reactive'
import { div, dynamicChild, type Child } from '@vaakx-dev/vrui'
import type { ChatContext } from './context'
import { searchHint } from './idle'

const size = 48

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
    { class: 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 px-5 pb-32 text-center' },
    div({ class: 'flex' }, mark(ctx, changes)),
    dynamicChild(
      changes.read(() => !ctx.threads.current()),
      idle => (idle ? searchHint(ctx) : null),
    ),
  )
}

const stateFrame = (state: Child) => div({ class: 'flex justify-center pt-4' }, state)

export const failed = ({ errorState }: Kit, message: string, retry: () => void) => stateFrame(errorState({ text: `Couldn't load this thread: ${message}`, retry }))

export const loading = ({ loadingState }: Kit) => stateFrame(loadingState())
