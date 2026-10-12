import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Notice } from '../contract'
import { group, noticeType, notifyName } from '../names'

const input = z.object({ text: z.string().min(1).max(2000).describe('What to tell the user, in one or two sentences') })

export const notifyTool: Tool<typeof input> = {
  name: notifyName,
  group,
  description:
    "Tell the user something now without ending your turn, such as progress on long work or something they should look at. It stays in the thread and alerts them even when the page isn't open in front of them.",
  input,
  run({ text }, { session }) {
    session.append(noticeType, { text } satisfies Notice)
    return 'The user was notified.'
  },
}
