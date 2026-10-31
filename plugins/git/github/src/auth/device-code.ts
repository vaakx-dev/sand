const codePattern = /one-time code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i
const urlPattern = /https:\/\/[^\s"')]+/

export interface FoundCode {
  code: string
  url?: string
}

export const findCode = (text: string): FoundCode | undefined => {
  const match = codePattern.exec(text)
  if (!match?.[1]) return undefined
  const url = urlPattern.exec(text.slice(match.index))?.[0]?.replace(/[.,;:]+$/, '')
  return { code: match[1].toUpperCase(), ...(url ? { url } : {}) }
}

export const readText = async (stream: ReadableStream<Uint8Array>, onText: (text: string) => void) => {
  const decoder = new TextDecoder()
  for await (const chunk of stream) onText(decoder.decode(chunk, { stream: true }))
}
