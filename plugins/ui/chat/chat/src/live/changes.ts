import { changesLive, type ChangesLive } from '@sand/changes/contract'
import { sig } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'

export const threadChanges = (ctx: ChatContext) => {
  const live = sig<ChangesLive | undefined>(undefined)
  ctx.watch(changesLive, found => live.set(found))
  return (thread: string) => live.get()?.get(thread)
}
