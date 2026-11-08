import type { Pulse } from '@sand/reactive'
import { folderName } from '@sand/util'
import { projects } from '@sand/web-client/contract'
import type { ChatContext } from '../context'

const projectName = (ctx: ChatContext) => {
  const draft = ctx.threads.drafting()
  if (!draft?.cwd) return ''
  const found = ctx.get(projects)
  return found?.group(draft.cwd, draft.device)?.name || (found?.name(draft.cwd, draft.device) ?? folderName(draft.cwd))
}

export const draftHead = (ctx: ChatContext, changes: Pulse) => ctx.kit.barTitle(changes.read(() => projectName(ctx)))
