import type { TextBlock } from '@sand/protocol'

export interface Feedback {
  source: string
  text: string
}

const pattern = /^<stop-feedback source="([^"]+)">([\s\S]*)<\/stop-feedback>$/

export const stopFeedback = (source: string, text: string): TextBlock => ({
  type: 'text',
  text: `<stop-feedback source="${source}">\n${text.trim()}\n</stop-feedback>`,
})

export const readFeedback = (text: string): Feedback | undefined => {
  const match = pattern.exec(text.trim())
  return match ? { source: match[1]!, text: match[2]!.trim() } : undefined
}

export const feedbackLine = (feedback: Feedback) => feedback.text.split('\n')[0]!.trim()
