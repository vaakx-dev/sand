import type { ConsoleMessage } from './contract'

const consoleHeading = '\n\nConsole:'
const size = /^Height (\d+)px at (\d+)px wide\./

export const sizeNote = (height: number, width: number) => `Height ${height}px at ${width}px wide.`

export const consoleNote = (messages: ConsoleMessage[]) =>
  messages.length ? `${consoleHeading}\n${messages.map(message => `${message.level}: ${message.text}`).join('\n')}` : `${consoleHeading} no output.`

export const readReport = (text: string) => {
  const [, height, width] = size.exec(text) ?? []
  const start = text.indexOf(`${consoleHeading}\n`)
  return {
    height: Number(height),
    width: Number(width),
    logged: start < 0 ? [] : text.slice(start + consoleHeading.length + 1).split('\n'),
  }
}

export const isErrorLine = (line: string) => line.startsWith('error: ')
