import { timestamp } from '@sand/util'

export const notificationTag = 'task-notification'

export interface Notification {
  from: string
  id: string
  kind: string
  label: string
  status: string
  at: number
  result: string
}

const resultLimit = 30_000

export const clipResult = (text: string) => (text.length > resultLimit ? `${text.slice(0, resultLimit)}\n… ${text.length - resultLimit} characters truncated` : text)

export const notificationText = ({ from, id, kind, label, status, at, result }: Notification) =>
  [
    `<${notificationTag}>`,
    `<${from}>${id}</${from}>`,
    `<kind>${kind}</kind>`,
    `<label>${label}</label>`,
    `<status>${status}</status>`,
    `<at>${timestamp(at)}</at>`,
    '<result>',
    clipResult(result),
    '</result>',
    `</${notificationTag}>`,
  ].join('\n')

export const notificationField = (text: string, name: string) => new RegExp(`<${name}>\\n?([\\s\\S]*?)\\n?</${name}>`).exec(text)?.[1]?.trim() ?? ''
