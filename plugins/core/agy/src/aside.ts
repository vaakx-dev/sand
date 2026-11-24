import type { AppAsk, AppSetup } from '@sand/accounts/contract'
import { textOf, type Message } from '@sand/chats/contract'
import { join } from 'node:path'

const AGENT = 'sand-aside'

const AGENT_FILE = `---
name: ${AGENT}
description: Answers one question about the end of a chat in a single short reply
excludeDefaultComponents: true
tools: []
---
You see the end of a chat between a user and an AI assistant, then one question about it. Answer the question in one short reply, using only what the chat shows.
`

const EFFORT = 'low'

const RECENT_CHARS = 8_000

const SPEAKERS: Record<Message['role'], string> = { user: 'User', assistant: 'Assistant' }

function said(message: Message): string[] {
  const text = textOf(message.content).trim()
  return text ? [`${SPEAKERS[message.role]}: ${text}`] : []
}

function recentChat(messages: Message[]): string {
  return messages.flatMap(said).join('\n\n').slice(-RECENT_CHARS)
}

function asidePrompt({ question, messages }: AppAsk): string {
  return `<chat>\n${recentChat(messages)}\n</chat>\n\n${question}`
}

async function asideSetup({ model }: AppSetup, workspace: string): Promise<AppSetup> {
  await Bun.write(join(workspace, '.agents', 'agents', `${AGENT}.md`), AGENT_FILE)
  return { model, effort: EFFORT, system: '', tools: [], cwd: workspace, persist: false }
}

export { AGENT, asidePrompt, asideSetup }
