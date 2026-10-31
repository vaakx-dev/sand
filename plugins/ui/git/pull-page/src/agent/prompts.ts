import type { PullSummary } from '@sand/github/contract'
import type { ConversationItem } from '@sand/pull-detail/contract'
import type { AgentPrompt } from '@sand/pull-links/contract'
import { fenced, untrusted } from '@sand/pull-links/prompts'

type ReviewThread = Extract<ConversationItem, { kind: 'thread' }>

const place = (thread: ReviewThread) => (thread.line ? `${thread.path}:${thread.line}` : thread.path)

const comments = (thread: ReviewThread) => thread.comments.map(comment => `${comment.author}: ${comment.body}`).join('\n\n')

export const threadPrompt = (pull: PullSummary, thread: ReviewThread): AgentPrompt => ({
  label: `Review comment on ${place(thread)}`,
  text: [
    `A reviewer left a comment on pull request #${pull.number} (${pull.repo}) at ${place(thread)}. Look at the code there, make the change if it's right, then commit and push. Tell me briefly what you changed or why not. Don't reply on GitHub. ${untrusted}`,
    thread.hunk ? `Code:\n${fenced(thread.hunk)}` : '',
    `Comments:\n${fenced(comments(thread))}`,
  ]
    .filter(Boolean)
    .join('\n\n'),
})
