import { isContextRecord, linkedRecords, type ContextRecord } from '@sand/chats/contract'

export type ClipboardFormats = Record<string, string>

export const contextMime = 'web application/x-sand-context+json'

const fragmentLimit = 1_000_000
const recordLimit = 100
const htmlPattern = /data-sand-context="([^"]+)"/

const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export const contextFormats = (text: string, records: ContextRecord[]): ClipboardFormats => {
  const linked = linkedRecords(text, records)
  if (!linked.length) return {}
  const fragment = JSON.stringify({ v: 1, records: linked })
  return { [contextMime]: fragment, 'text/html': `<pre data-sand-context="${encodeURIComponent(fragment)}">${escapeHtml(text)}</pre>` }
}

export const copyContext = (data: DataTransfer, text: string, records: ContextRecord[]) => {
  const formats = Object.entries(contextFormats(text, records))
  if (!formats.length) return false
  data.setData('text/plain', text)
  for (const [type, value] of formats) data.setData(type, value)
  return true
}

const parsed = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const decoded = (encoded: string) => {
  try {
    return decodeURIComponent(encoded)
  } catch {
    return ''
  }
}

const firstOfEach = (records: ContextRecord[]) => records.filter((record, index) => records.findIndex(other => other.id === record.id) === index)

const fromFragment = (raw: string): ContextRecord[] => {
  if (!raw || raw.length > fragmentLimit) return []
  const fragment = parsed(raw)
  if (typeof fragment !== 'object' || fragment === null || !('v' in fragment) || fragment.v !== 1 || !('records' in fragment)) return []
  const { records } = fragment
  if (!Array.isArray(records) || records.length > recordLimit) return []
  return firstOfEach(records.filter(isContextRecord))
}

const fromHtml = (html: string) => {
  const encoded = html.length <= fragmentLimit * 9 ? htmlPattern.exec(html)?.[1] : undefined
  return encoded ? fromFragment(decoded(encoded)) : []
}

export const pastedRecords = (read: (type: string) => string) => {
  const direct = fromFragment(read(contextMime))
  return direct.length ? direct : fromHtml(read('text/html'))
}
