const isHigh = (code: number) => code >= 0xd800 && code <= 0xdbff
const isLow = (code: number) => code >= 0xdc00 && code <= 0xdfff

const splits = (text: string, index: number) => isHigh(text.charCodeAt(index - 1)) && isLow(text.charCodeAt(index))

export const charStart = (text: string, index: number) => (splits(text, index) ? index - 1 : index)

export const head = (text: string, length: number) => text.slice(0, charStart(text, length))

export const tail = (text: string, length: number) => {
  const start = Math.max(0, text.length - length)
  return text.slice(splits(text, start) ? start + 1 : start)
}

export const clip = (text: string, max: number) => (text.length > max ? `${head(text, max)}…` : text)
