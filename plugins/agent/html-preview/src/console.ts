import type { Page } from './cdp'

export type Level = 'log' | 'info' | 'warning' | 'error'

export interface ConsoleMessage {
  level: Level
  text: string
}

export interface Console {
  messages: ConsoleMessage[]
  add(level: Level, text: string): void
}

const maxMessages = 50
const maxMessageLength = 1000

const levels: Record<string, Level> = { warning: 'warning', warn: 'warning', error: 'error', assert: 'error', info: 'info' }

const argText = (arg: Record<string, any>) => String(arg.value ?? arg.unserializableValue ?? arg.description ?? arg.type)

export const exceptionText = (details: Record<string, any>) => details.exception?.description ?? details.text

export const collect = (page: Page): Console => {
  const messages: ConsoleMessage[] = []
  const add = (level: Level, text: string) => {
    if (messages.length < maxMessages) messages.push({ level, text: text.slice(0, maxMessageLength) })
  }
  page.on('Runtime.consoleAPICalled', params => add(levels[params.type] ?? 'log', params.args.map(argText).join(' ')))
  page.on('Runtime.exceptionThrown', ({ exceptionDetails }) => add('error', exceptionText(exceptionDetails)))
  page.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'warning' || entry.level === 'error') add(entry.level, entry.url ? `${entry.text} (${entry.url})` : entry.text)
  })
  return { messages, add }
}
