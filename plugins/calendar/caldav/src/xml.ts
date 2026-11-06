export interface Element {
  name: string
  attributes: Record<string, string>
  children: Element[]
  text: string
}

export const dav = (name: string) => `{DAV:}${name}`
export const caldav = (name: string) => `{urn:ietf:params:xml:ns:caldav}${name}`
export const calendarserver = (name: string) => `{http://calendarserver.org/ns/}${name}`
export const apple = (name: string) => `{http://apple.com/ns/ical/}${name}`

export const namespaces = 'xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/" xmlns:a="http://apple.com/ns/ical/"'

const entities: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

const decode = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, code: string) => {
    if (code[0] !== '#') return entities[code] ?? whole
    return String.fromCodePoint(code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1)))
  })

const escapes: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;' }

export const escapeXml = (text: string) => text.replace(/[<>&]/g, char => escapes[char]!)

const tokens = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([^\s/>]+)([^>]*?)(\/?)>|([^<]+)/g

const attributePattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

export const parseXml = (xml: string): Element | undefined => {
  const root: Element = { name: '', attributes: {}, children: [], text: '' }
  const stack = [{ element: root, spaces: new Map<string, string>() }]
  for (const [, cdata, closing, tag, rest, selfClosing, text] of xml.matchAll(tokens)) {
    const top = stack.at(-1)!
    if (cdata !== undefined) top.element.text += cdata
    else if (text !== undefined) top.element.text += decode(text)
    else if (closing && tag) {
      if (stack.length > 1) stack.pop()
    } else if (tag) {
      const spaces = new Map(top.spaces)
      const attributes: Record<string, string> = {}
      for (const [, key = '', double, single] of (rest ?? '').matchAll(attributePattern)) {
        const value = decode(double ?? single ?? '')
        if (key === 'xmlns' || key.startsWith('xmlns:')) spaces.set(key.slice(6), value)
        else attributes[key] = value
      }
      const colon = tag.indexOf(':')
      const name = `{${spaces.get(colon < 0 ? '' : tag.slice(0, colon)) ?? ''}}${tag.slice(colon + 1)}`
      const element: Element = { name, attributes, children: [], text: '' }
      top.element.children.push(element)
      if (!selfClosing) stack.push({ element, spaces })
    }
  }
  return root.children[0]
}

export const childOf = (element: Element | undefined, name: string) => element?.children.find(child => child.name === name)

export const childrenOf = (element: Element | undefined, name: string) => element?.children.filter(child => child.name === name) ?? []

export const textOf = (element: Element | undefined, name: string) => childOf(element, name)?.text.trim() || undefined
