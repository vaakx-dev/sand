import type { Feedback, Message, TextBlock } from '@sand/messages'

export type { Feedback }

const pattern = /^<(stop-feedback|note) source="([^"]+)">([\s\S]*)<\/\1>$/

export const stopFeedback = (source: string, text: string): TextBlock => ({
  type: 'text',
  text: `<stop-feedback source="${source}">\n${text.trim()}\n</stop-feedback>`,
})

export const noteBlock = (source: string, text: string): TextBlock => ({
  type: 'text',
  text: `<note source="${source}">\n${text.trim()}\n</note>`,
})

export const readFeedback = (text: string): Feedback | undefined => {
  const match = pattern.exec(text.trim())
  return match ? { source: match[2]!, text: match[3]!.trim() } : undefined
}

export const feedbackOnly = (message: Message) =>
  message.content.length > 0 && message.content.every(block => block.type === 'text' && readFeedback(block.text))

export const feedbackLine = (feedback: Feedback) => feedback.text.split('\n')[0]!.trim()
