import type { Pulse } from '@sand/reactive'
import { folderName } from '@sand/util'
import { projects } from '@sand/web-client/contract'
import { div } from '@vaakx-dev/vrui'
import type { ChatContext } from './context'

const placeName = (ctx: ChatContext) => {
  const draft = ctx.threads.drafting()
  if (!draft?.cwd) return 'Sand'
  const found = ctx.get(projects)
  return found?.group(draft.cwd, draft.device)?.name || (found?.name(draft.cwd, draft.device) ?? folderName(draft.cwd))
}

export const draftLine = (ctx: ChatContext, changes: Pulse) =>
  div({ class: 'flex min-w-0 justify-center px-5 pb-2' }, ctx.kit.secondaryText(changes.read(() => placeName(ctx))))
