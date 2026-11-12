import { palette } from '@sand/palette/contract'
import { newChatPage } from '../palette/projects'
import { currentPick } from './picks'
import { moveDraft, type Start, startChat, type StartParts } from './start'

const pickPlace = (parts: StartParts, start: Start) => {
  const found = parts.ctx.get(palette)
  if (found) return found.open(newChatPage(parts, start))
  const { path, device } = currentPick(parts.ctx, parts.threads)
  start(path, device)
}

export const newThread = (parts: StartParts) => pickPlace(parts, startChat(parts))

export const chooseDraftPlace = (parts: StartParts, draft: string) => pickPlace(parts, moveDraft(parts, draft))
