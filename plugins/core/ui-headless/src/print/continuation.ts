import type { UserContent } from '@sand/protocol'
import { feedbackLine, oneLine, userParts } from '@sand/kit'

export const continuation = (content: UserContent[]) =>
  userParts({ role: 'user', content })
    .flatMap(part => {
      if (part.kind === 'feedback') return [feedbackLine(part.feedback)]
      return part.kind === 'text' ? [oneLine(part.text, 200)] : []
    })
    .join(' · ') || 'continuing'
