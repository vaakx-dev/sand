export interface Property {
  name: string
  params: Record<string, string>
  value: string
}

export interface Component {
  name: string
  properties: Property[]
  children: Component[]
}

const readParams = (text: string) => {
  const params: Record<string, string> = {}
  for (const match of text.matchAll(/;([^=;:]+)=("[^"]*"|[^;:]*)/g)) params[match[1]!.toUpperCase()] = match[2]!.replace(/^"|"$/g, '')
  return params
}

const valueStart = (line: string) => {
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"') quoted = !quoted
    else if (char === ':' && !quoted) return index
  }
  return -1
}

export const readLine = (line: string): Property | undefined => {
  const colon = valueStart(line)
  if (colon < 0) return
  const head = line.slice(0, colon)
  const semicolon = head.indexOf(';')
  const name = (semicolon < 0 ? head : head.slice(0, semicolon)).toUpperCase()
  return { name, params: semicolon < 0 ? {} : readParams(head.slice(semicolon)), value: line.slice(colon + 1) }
}

export const readComponents = (text: string): Component[] => {
  const root: Component = { name: '', properties: [], children: [] }
  const stack = [root]
  for (const line of text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
    const property = readLine(line)
    if (!property) continue
    const top = stack.at(-1)!
    if (property.name === 'BEGIN') {
      const child = { name: property.value.toUpperCase(), properties: [], children: [] }
      top.children.push(child)
      stack.push(child)
    } else if (property.name === 'END') {
      if (stack.length > 1) stack.pop()
    } else top.properties.push(property)
  }
  return root.children
}

export const unescapeText = (value: string) => value.replace(/\\([\\;,nN])/g, (_, char: string) => (char.toLowerCase() === 'n' ? '\n' : char))

export const escapeText = (value: string) => value.replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n')

const quoteParam = (value: string) => (/[;:,]/.test(value) ? `"${value.replace(/"/g, "'")}"` : value)

const encoder = new TextEncoder()

export const fold = (line: string) => {
  const parts: string[] = []
  let part = ''
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    if (size + bytes > (parts.length ? 74 : 75)) {
      parts.push(part)
      part = ''
      size = 0
    }
    part += char
    size += bytes
  }
  parts.push(part)
  return parts.join('\r\n ')
}

export const contentLine = (name: string, value: string, params: Record<string, string | undefined> = {}) => {
  const head = Object.entries(params)
    .flatMap(([key, param]) => (param === undefined ? [] : [`;${key}=${quoteParam(param)}`]))
    .join('')
  return `${name}${head}:${value}`
}

export const writeLine = (name: string, value: string, params: Record<string, string | undefined> = {}) => fold(contentLine(name, value, params))
