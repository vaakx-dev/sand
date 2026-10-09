import type { Message } from '@sand/messages'
import type { Command } from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { feedbackOnly, oneLine, promptText } from '@sand/kit'
import type { SessionsContext } from './types'

const userPrompts = (session: Session) =>
  session
    .path()
    .filter(entry => entry.type === 'message' && (entry.data as Message).role === 'user' && !feedbackOnly(entry.data as Message))
    .map(entry => ({ entry, message: entry.data as Message, text: promptText(entry.data as Message, ' ') }))
    .filter(({ text }) => text.trim())
    .reverse()

const toolResults = (message: Message) => message.content.filter(block => block.type === 'tool_result')

export const forkCommand = (ctx: SessionsContext): Command => ({
  name: 'fork',
  title: 'Fork from an earlier message',
  description: 'Create a new thread from an earlier user message',
  async run() {
    const session = ctx.ui.session()
    if (!session?.head) return ctx.ui.notify('Nothing to fork yet')
    if (ctx.loop?.active(session)) return ctx.ui.notify('Wait for the current turn to finish', 'error')
    const picked = await ctx.ui.pick(
      'Fork from before',
      userPrompts(session).map(prompt => ({ label: oneLine(prompt.text, 100), value: prompt })),
    )
    if (!picked) return
    const fork = ctx.sessions.branch(session, undefined, picked.entry.parent)
    const results = toolResults(picked.message)
    if (results.length) fork.append('message', { role: 'user', content: results })
    ctx.ui.open(fork, picked.text)
    ctx.ui.notify('Forked into a new thread.')
  },
})
