import type { BrowserTab, ConsoleEntry, Opened } from '@sand/browser-engine/contract'

const firstLine = (text: string) => text.split('\n')[0] ?? ''

export const pageLine = ({ title, url, status }: Opened) => `Page: ${title || 'untitled'} (${url})${status && status >= 400 ? `, HTTP ${status}` : ''}`

export const errorLines = (errors: ConsoleEntry[]) =>
  errors.length ? `\nNew console errors:\n${errors.map(error => `- ${firstLine(error.text)}${error.source ? ` (${error.source})` : ''}`).join('\n')}` : ''

export const afterAction = (tab: BrowserTab, since: number, done: string) => `${done}\n${pageLine(tab.state())}${errorLines(tab.agent.errorsSince(since))}`
