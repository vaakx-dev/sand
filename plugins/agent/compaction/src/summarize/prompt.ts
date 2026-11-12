import { summaryFormat } from './format'
import type { CompactionBrief } from '../contract'

const noReply = "Don't continue the conversation, answer it or call tools."

export const system = `You summarize a conversation between a user and an AI assistant so the assistant can carry on from the summary alone. It can be about anything: code, research, planning, writing or everyday chat.

Keep what the current work needs and drop work that is finished or stale.

${noReply}`

const format = `Output only the summary. ${summaryFormat}`

export const summaryBrief: CompactionBrief = {
  format: async () => format,
  accept: async reply => reply,
}

const fresh = 'Summarize the transcript in <conversation> tags above.'

const update = 'The transcript in <conversation> tags above continues the conversation summarized in <previous-summary>. Update that summary with it.'

const inContext = `Stop here. Summarize this conversation so you can carry on from the summary and your system prompt alone. Leave out what your system prompt already says. If it starts with an earlier summary, keep only what the current work still needs.

${noReply}`

const focus = (instructions?: string) => instructions && `Additional focus: ${instructions}`

export const inContextText = (format: string, instructions?: string) => [inContext, format, focus(instructions)].filter(Boolean).join('\n\n')

export const promptText = (format: string, conversation: string, previous?: string, instructions?: string) =>
  [
    `<conversation>\n${conversation}\n</conversation>`,
    previous && `<previous-summary>\n${previous}\n</previous-summary>`,
    previous ? update : fresh,
    format,
    focus(instructions),
  ]
    .filter(Boolean)
    .join('\n\n')
